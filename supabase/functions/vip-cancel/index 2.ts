import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const schema = z.object({
  reservation_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
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

    const allowed = await checkRateLimit("vip-cancel", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Invalid input", { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { reservation_id, reason } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: reservation, error: reservationErr } = await serviceClient
      .from("vip_table_reservations")
      .select("id, user_id, status, stripe_payment_intent_id, amount_cents, currency, event_id, stripe_account_id")
      .eq("id", reservation_id)
      .single();

    if (reservationErr || !reservation) {
      return errorResponse(404, "VIP reservation not found", { requestId });
    }

    if (reservation.status === "cancelled" || reservation.status === "expired") {
      return errorResponse(400, `Reservation is ${reservation.status}`, { requestId });
    }

    if (reservation.user_id !== user.id) {
      const { data: event } = await serviceClient
        .from("events")
        .select("host_id, organiser_profile_id")
        .eq("id", reservation.event_id)
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
        return errorResponse(403, "Not authorized to cancel this reservation", { requestId });
      }
    }

    const now = new Date().toISOString();

    if (reservation.status === "reserved") {
      if (reservation.stripe_payment_intent_id) {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          try {
            await stripe.paymentIntents.cancel(reservation.stripe_payment_intent_id);
          } catch (err) {
            edgeLog("warn", "Failed to cancel VIP PaymentIntent", {
              requestId,
              reservation_id,
              error: String(err),
            });
          }
        }
      }

      const { error: updateErr } = await serviceClient
        .from("vip_table_reservations")
        .update({ status: "cancelled", cancelled_at: now })
        .eq("id", reservation_id);

      if (updateErr) {
        edgeLog("error", "vip-cancel update failed", { requestId, error: String(updateErr) });
        return errorResponse(500, "Failed to cancel reservation", { requestId });
      }

      return successResponse({ success: true, cancelled: true }, requestId);
    }

    if (!reservation.stripe_payment_intent_id) {
      return errorResponse(400, "Missing payment intent for refund", { requestId });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: reservation.stripe_payment_intent_id,
      amount: reservation.amount_cents,
    };

    if (reservation.stripe_account_id) {
      refundParams.refund_application_fee = true;
      refundParams.reverse_transfer = true;
    }

    const refund = await stripe.refunds.create(refundParams);

    await serviceClient.from("vip_refunds").insert({
      vip_reservation_id: reservation_id,
      stripe_refund_id: refund.id,
      amount_cents: refund.amount ?? reservation.amount_cents,
      reason: reason ?? null,
      status: refund.status ?? "pending",
      initiated_by: user.id,
    });

    const { error: updateErr } = await serviceClient
      .from("vip_table_reservations")
      .update({ status: "cancelled", cancelled_at: now })
      .eq("id", reservation_id);

    if (updateErr) {
      edgeLog("error", "vip-cancel update failed", { requestId, error: String(updateErr) });
      return errorResponse(500, "Failed to cancel reservation", { requestId });
    }

    return successResponse({ success: true, refunded: true, refund_id: refund.id }, requestId);
  } catch (err) {
    edgeLog("error", "vip-cancel error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
