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
});

function ticketSelfRefundAllowed(opts: {
  now: Date;
  eventDate: Date;
  refundsEnabled: boolean;
  refundDeadlineHoursBeforeEvent: number | null | undefined;
}): { ok: boolean; reason?: string } {
  if (!opts.refundsEnabled) {
    return { ok: false, reason: "Refunds are not enabled for this event." };
  }
  if (opts.now.getTime() >= opts.eventDate.getTime()) {
    return { ok: false, reason: "This event has already started or ended." };
  }
  const h = opts.refundDeadlineHoursBeforeEvent;
  if (h != null && h > 0) {
    const cutoffMs = opts.eventDate.getTime() - h * 60 * 60 * 1000;
    if (opts.now.getTime() >= cutoffMs) {
      return {
        ok: false,
        reason: `The refund window closed ${h} hour${h === 1 ? "" : "s"} before the event.`,
      };
    }
  }
  return { ok: true };
}

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

    const allowed = await checkRateLimit("refunds-request-self", user.id, getClientIp(req));
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
      .select("id, user_id, event_id, status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return errorResponse(404, "Order not found", { requestId });
    }

    if (order.user_id !== user.id) {
      return errorResponse(403, "You can only refund your own orders", { requestId });
    }

    const { data: event, error: evErr } = await serviceClient
      .from("events")
      .select("id, title, host_id, event_date, refunds_enabled, refund_deadline_hours_before_event")
      .eq("id", order.event_id)
      .maybeSingle();

    if (evErr || !event) {
      return errorResponse(404, "Event not found", { requestId });
    }

    const policy = ticketSelfRefundAllowed({
      now: new Date(),
      eventDate: new Date(event.event_date),
      refundsEnabled: !!event.refunds_enabled,
      refundDeadlineHoursBeforeEvent: event.refund_deadline_hours_before_event,
    });

    if (!policy.ok) {
      return errorResponse(400, policy.reason ?? "Refund not allowed", { requestId });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      edgeLog("error", "STRIPE_SECRET_KEY missing", { requestId });
      return errorResponse(500, "Payments not configured", { requestId });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const result = await processRefund({
      orderId: order_id,
      reason: "Self-service refund",
      initiatedBy: user.id,
      stripe,
      serviceClient,
    });

    if (!result.success) {
      return errorResponse(400, result.error ?? "Refund failed", { requestId });
    }

    try {
      await serviceClient.from("notifications").insert({
        user_id: event.host_id,
        type: "ticket_refund",
        title: "Ticket refunded",
        message: `A buyer requested a refund for “${event.title}”.`,
        link: `/events/${event.id}/manage`,
      });
    } catch (notifyErr) {
      edgeLog("warn", "Refund notification insert failed (non-fatal)", { requestId, error: String(notifyErr) });
    }

    return successResponse({ success: true, refund_id: result.refundId }, requestId);
  } catch (err) {
    edgeLog("error", "refunds-request-self error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
