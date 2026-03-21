import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { promoteWaitlist } from "../_shared/waitlist-service.ts";

const schema = z.object({
  order_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Not authenticated", { requestId });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Invalid token", { requestId });
    }

    const allowed = await checkRateLimit("orders-cancel", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid input", { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { order_id } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderErr } = await serviceClient
      .from("orders")
      .select("id, user_id, status, stripe_payment_intent_id, event_id")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return errorResponse(404, "Order not found", { requestId });
    }

    if (order.status !== "reserved") {
      return errorResponse(400, `Order is ${order.status}, cannot cancel`, { requestId });
    }

    if (order.user_id !== user.id) {
      const { data: event } = await serviceClient
        .from("events")
        .select("host_id, organiser_profile_id")
        .eq("id", order.event_id)
        .single();

      if (!event) return errorResponse(404, "Event not found", { requestId });

      let isAuthorized = event.host_id === user.id;
      if (!isAuthorized && event.organiser_profile_id) {
        const [orgResult, memberResult] = await Promise.all([
          serviceClient.from("organiser_profiles").select("owner_id").eq("id", event.organiser_profile_id).maybeSingle(),
          serviceClient
            .from("organiser_members")
            .select("id")
            .eq("organiser_profile_id", event.organiser_profile_id)
            .eq("user_id", user.id)
            .eq("status", "accepted")
            .maybeSingle(),
        ]);
        if (orgResult.data?.owner_id === user.id || memberResult.data) {
          isAuthorized = true;
        }
      }
      if (!isAuthorized) {
        return errorResponse(403, "Not authorized to cancel this order", { requestId });
      }
    }

    const now = new Date().toISOString();

    if (order.stripe_payment_intent_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        try {
          await stripe.paymentIntents.cancel(order.stripe_payment_intent_id);
        } catch (err) {
          edgeLog("warn", "Failed to cancel PaymentIntent", {
            requestId,
            order_id,
            error: String(err),
          });
        }
      }
    }

    const { error: updateErr } = await serviceClient
      .from("orders")
      .update({ status: "cancelled", cancelled_at: now })
      .eq("id", order_id);

    if (updateErr) {
      edgeLog("error", "orders-cancel update failed", { requestId, error: String(updateErr) });
      return errorResponse(500, "Failed to cancel order", { requestId });
    }

    try {
      await promoteWaitlist(serviceClient, order.event_id);
    } catch (promoteErr) {
      edgeLog("warn", "Waitlist promotion failed after cancel", {
        requestId,
        event_id: order.event_id,
        error: String(promoteErr),
      });
    }

    edgeLog("info", "Order cancelled", { requestId, order_id });
    return successResponse({ success: true, cancelled: true }, requestId);
  } catch (err) {
    edgeLog("error", "orders-cancel error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
