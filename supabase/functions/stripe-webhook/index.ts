import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

// Register all job handlers before any enqueue() calls
import "../_shared/job-handlers.ts";
import { enqueue } from "../_shared/queue.ts";
import type {
  TicketsIssuePayload,
  AutoRsvpPayload,
  LoyaltyAwardPayload,
} from "../_shared/queue.ts";

/**
 * Stripe Webhook handler
 * Side-effects (tickets, RSVP, loyalty) are dispatched via the queue abstraction.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2025-08-27.basil',
  });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    edgeLog('error', 'Missing signature or webhook secret', { requestId });
    return errorResponse(400, 'Missing signature', { requestId });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    edgeLog('error', 'Webhook signature verification failed', { requestId, error: String(err) });
    return errorResponse(400, 'Invalid signature', { requestId });
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Idempotency check
  const { data: existing } = await serviceClient
    .from('payment_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existing) {
    edgeLog('info', `Already processed event ${event.id}, skipping`, { requestId });
    return successResponse({ received: true }, requestId);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        if (pi.metadata?.reservation_type === 'vip_table') {
          const reservationId = pi.metadata?.vip_reservation_id;
          if (!reservationId) {
            edgeLog('error', 'No vip_reservation_id in payment intent metadata', { requestId });
            break;
          }

          const { data: reservation, error: reservationErr } = await serviceClient
            .from('vip_table_reservations')
            .select('*')
            .eq('id', reservationId)
            .single();

          if (reservationErr || !reservation) {
            edgeLog('error', 'VIP reservation not found', { requestId, reservationId });
            break;
          }

          if (reservation.status !== 'reserved') {
            edgeLog('info', `VIP reservation ${reservationId} already ${reservation.status}, skipping`, { requestId });
            break;
          }

          await serviceClient
            .from('vip_table_reservations')
            .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
            .eq('id', reservationId);

          await serviceClient
            .from('rsvps')
            .upsert(
              { event_id: reservation.event_id, user_id: reservation.user_id, status: 'going', guest_count: reservation.guest_count },
              { onConflict: 'event_id,user_id' },
            );

          await serviceClient.from('notifications').insert({
            user_id: reservation.user_id,
            type: 'vip_table_confirmed',
            title: 'VIP table confirmed',
            message: 'Your VIP table reservation is confirmed.',
            link: `/events/${reservation.event_id}`,
          });

          edgeLog('info', `VIP reservation ${reservationId} confirmed`, { requestId });
          break;
        }

        const orderId = pi.metadata?.order_id;
        if (!orderId) {
          edgeLog('error', 'No order_id in payment intent metadata', { requestId });
          break;
        }

        const { data: order, error: orderErr } = await serviceClient
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderErr || !order) {
          edgeLog('error', 'Order not found', { requestId, orderId });
          break;
        }

        if (order.status !== 'reserved') {
          edgeLog('info', `Order ${orderId} already ${order.status}, skipping`, { requestId });
          break;
        }

        // Core state change — stays inline
        await serviceClient
          .from('orders')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', orderId);

        // ── Side-effects dispatched via queue ──────────────────────
        await Promise.allSettled([
          enqueue<TicketsIssuePayload>('tickets.issue', {
            order_id: orderId,
            event_id: order.event_id,
            ticket_tier_id: order.ticket_tier_id || null,
            user_id: order.user_id,
            quantity: order.quantity,
          }),

          enqueue<AutoRsvpPayload>('rsvp.auto_mark_going', {
            user_id: order.user_id,
            event_id: order.event_id,
            status: 'going',
          }),

          enqueue<LoyaltyAwardPayload>('loyalty.award_points', {
            user_id: order.user_id,
            action_type: 'buy_ticket',
            description: `Purchased ${order.quantity} ticket(s)`,
          }),
        ]);

        // Conversion record (confirmed purchase)
        await serviceClient
          .from('event_link_conversions')
          .upsert(
            {
              event_id: order.event_id,
              order_id: orderId,
              user_id: order.user_id,
              click_id: order.referral_click_id ?? null,
            },
            { onConflict: 'order_id' },
          );

        edgeLog('info', `Order ${orderId} confirmed, side-effects enqueued`, { requestId });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (!orderId) break;
        edgeLog('info', `Payment failed for order ${orderId} — reservation still active until expiry`, { requestId });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const pi = charge.payment_intent as string;
        if (!pi) break;

        const { data: refundOrder } = await serviceClient
          .from('orders')
          .select('id, event_id, user_id')
          .eq('stripe_payment_intent_id', pi)
          .single();

        if (!refundOrder) {
          edgeLog('error', 'No order found for refunded charge PI', { requestId, paymentIntent: pi });
          break;
        }

        await serviceClient
          .from('orders')
          .update({ status: 'refunded', cancelled_at: new Date().toISOString() })
          .eq('id', refundOrder.id);

        await serviceClient
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('order_id', refundOrder.id);

        const refundId = (charge.refunds as any)?.data?.[0]?.id ?? null;
        if (refundId) {
          const { data: existingRefund } = await serviceClient
            .from('refunds')
            .select('id')
            .eq('order_id', refundOrder.id)
            .eq('stripe_refund_id', refundId)
            .maybeSingle();

          if (!existingRefund) {
            await serviceClient.from('refunds').insert({
              order_id: refundOrder.id,
              stripe_refund_id: refundId,
              amount_cents: charge.amount_refunded || 0,
              reason: 'charge.refunded webhook',
              status: 'succeeded',
              initiated_by: null,
            });
          }
        }

        edgeLog('info', `Order ${refundOrder.id} refunded, tickets cancelled`, { requestId });
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const stripeAccountId = account.id;
        const chargesEnabled = account.charges_enabled ?? false;
        const payoutsEnabled = account.payouts_enabled ?? false;
        const detailsSubmitted = account.details_submitted ?? false;

        const { error: updateErr } = await serviceClient
          .from('organiser_stripe_accounts')
          .update({
            charges_enabled: chargesEnabled,
            payouts_enabled: payoutsEnabled,
            onboarding_complete: detailsSubmitted,
          })
          .eq('stripe_account_id', stripeAccountId);

        if (updateErr) {
          edgeLog('error', 'Failed to update organiser stripe account', { requestId, error: String(updateErr) });
        } else {
          edgeLog('info', `Updated stripe account ${stripeAccountId}: charges=${chargesEnabled}, payouts=${payoutsEnabled}`, { requestId });
        }
        break;
      }

      default:
        edgeLog('info', `Unhandled event type: ${event.type}`, { requestId });
    }

    // Record for idempotency — must succeed so Stripe retries on failure
    const { error: insertErr } = await serviceClient
      .from('payment_events')
      .insert({
        order_id: (event.data.object as any)?.metadata?.order_id || null,
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event.data.object as any,
      });

    if (insertErr) {
      edgeLog('error', 'payment_events insert failed', { requestId, error: String(insertErr) });
      return errorResponse(500, 'Failed to record event', { requestId });
    }

  } catch (err) {
    edgeLog('error', 'Error processing webhook', { requestId, error: String(err) });
    return errorResponse(500, 'Webhook processing failed', { requestId });
  }

  return successResponse({ received: true }, requestId);
});
