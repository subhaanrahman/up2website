import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { processRefund } from "../_shared/refund.ts";

const schema = z.object({
  order_id: z.string().uuid(),
  reason: z.string().max(500).default("Refund requested"),
  amount_cents: z.number().int().positive().optional(),
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

    const allowed = await checkRateLimit("refunds-create", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid input", { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { order_id, reason, amount_cents } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderErr } = await serviceClient
      .from("orders")
      .select("id, event_id")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return errorResponse(404, "Order not found", { requestId });
    }

    const { data: event } = await serviceClient
      .from("events")
      .select("id, host_id, organiser_profile_id")
      .eq("id", order.event_id)
      .single();

    if (!event) {
      return errorResponse(404, "Event not found", { requestId });
    }

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
      return errorResponse(403, "Not authorized to refund this order", { requestId });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const result = await processRefund({
      orderId: order_id,
      amountCents: amount_cents,
      reason,
      initiatedBy: user.id,
      stripe,
      serviceClient,
    });

    if (!result.success) {
      return errorResponse(400, result.error ?? "Refund failed", { requestId });
    }

    edgeLog("info", "Refund created", { requestId, order_id, refundId: result.refundId });
    return successResponse({ success: true, refund_id: result.refundId }, requestId);
  } catch (err) {
    edgeLog("error", "refunds-create error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
