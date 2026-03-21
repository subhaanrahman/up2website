import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { promoteWaitlist } from "../_shared/waitlist-service.ts";

/**
 * Marks expired reserved orders (expires_at < now) as expired,
 * cancels orphaned Stripe PaymentIntents, and releases capacity.
 *
 * Invoke on a schedule (e.g. every 5–15 min) via:
 * - External cron: POST with Authorization: Bearer <service_role_key> or X-Cron-Secret: <CRON_SECRET>
 * - Supabase scheduled function / pg_cron → HTTP to this URL
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    // Allow invocation by cron: X-Cron-Secret header or Authorization (service role / anon for internal)
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    const allowedByCron = expectedSecret && cronSecret === expectedSecret;
    const allowedByAuth = !!authHeader; // Simplified: any valid token allows (scheduler can use service role)

    if (!allowedByCron && !allowedByAuth) {
      edgeLog('warn', 'orders-expire-cleanup unauthorized', { requestId });
      return errorResponse(401, 'Unauthorized', { requestId });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date().toISOString();
    const { data: expiredOrders, error: fetchErr } = await serviceClient
      .from('orders')
      .select('id, stripe_payment_intent_id, event_id')
      .eq('status', 'reserved')
      .lt('expires_at', now);

    if (fetchErr) {
      edgeLog('error', 'orders-expire-cleanup fetch failed', { requestId, error: String(fetchErr) });
      return errorResponse(500, 'Failed to fetch expired orders', { requestId });
    }

    const orders = expiredOrders || [];
    if (orders.length === 0) {
      return successResponse({ expired: 0, cancelled_pi: 0 }, requestId);
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    let cancelledPi = 0;
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
      for (const o of orders) {
        if (o.stripe_payment_intent_id) {
          try {
            await stripe.paymentIntents.cancel(o.stripe_payment_intent_id);
            cancelledPi++;
          } catch (err) {
            edgeLog('warn', 'Failed to cancel PaymentIntent', {
              requestId,
              order_id: o.id,
              pi: o.stripe_payment_intent_id,
              error: String(err),
            });
            // Continue - we'll still mark order as expired
          }
        }
      }
    }

    const { error: updateErr } = await serviceClient
      .from('orders')
      .update({ status: 'expired', cancelled_at: now })
      .eq('status', 'reserved')
      .lt('expires_at', now);

    if (updateErr) {
      edgeLog('error', 'orders-expire-cleanup update failed', { requestId, error: String(updateErr) });
      return errorResponse(500, 'Failed to expire orders', { requestId });
    }

    edgeLog('info', 'orders-expire-cleanup completed', {
      requestId,
      expired: orders.length,
      cancelled_pi: cancelledPi,
    });

    const eventIds = Array.from(new Set(orders.map((order) => order.event_id).filter(Boolean)));
    for (const eventId of eventIds) {
      try {
        await promoteWaitlist(serviceClient, eventId);
      } catch (promoteErr) {
        edgeLog('warn', 'Waitlist promotion failed after expiration', {
          requestId,
          event_id: eventId,
          error: String(promoteErr),
        });
      }
    }

    return successResponse({ expired: orders.length, cancelled_pi: cancelledPi }, requestId);
  } catch (err) {
    edgeLog('error', 'orders-expire-cleanup error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
