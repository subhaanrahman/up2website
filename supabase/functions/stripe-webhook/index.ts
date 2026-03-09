import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Stripe Webhook handler
 * Handles payment_intent.succeeded and payment_intent.payment_failed
 * Verifies Stripe signature, processes idempotently using payment_events table
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2025-08-27.basil',
  });

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Idempotency check — skip if we already processed this event
  const { data: existing } = await serviceClient
    .from('payment_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existing) {
    console.log(`Already processed event ${event.id}, skipping`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (!orderId) {
          console.error('No order_id in payment intent metadata');
          break;
        }

        // Fetch the order
        const { data: order, error: orderErr } = await serviceClient
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderErr || !order) {
          console.error('Order not found:', orderId);
          break;
        }

        // Only confirm if still reserved (idempotent)
        if (order.status !== 'reserved') {
          console.log(`Order ${orderId} already ${order.status}, skipping`);
          break;
        }

        // Update order to confirmed
        await serviceClient
          .from('orders')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        // Issue tickets
        const tickets = Array.from({ length: order.quantity }, (_, i) => ({
          order_id: orderId,
          event_id: order.event_id,
          ticket_tier_id: order.ticket_tier_id || null,
          user_id: order.user_id,
          qr_code: `TKT-${orderId.slice(0, 8)}-${i + 1}-${crypto.randomUUID().slice(0, 8)}`,
          status: 'valid',
        }));

        const { error: ticketErr } = await serviceClient
          .from('tickets')
          .insert(tickets);

        if (ticketErr) {
          console.error('Failed to create tickets:', ticketErr);
        }

        // Auto-RSVP the user as 'going'
        await serviceClient
          .from('rsvps')
          .upsert(
            {
              event_id: order.event_id,
              user_id: order.user_id,
              status: 'going',
            },
            { onConflict: 'event_id,user_id' }
          );

        // Award loyalty points — use direct inserts since award_points RPC
        // relies on auth.uid() which is NULL in service-role context
        try {
          const { data: userPoints } = await serviceClient
            .from('user_points')
            .select('total_points, current_rank')
            .eq('user_id', order.user_id)
            .maybeSingle();

          const pointsToAward = 50; // buy_ticket action
          const currentPoints = userPoints?.total_points ?? 0;
          const newTotal = currentPoints + pointsToAward;

          const rankThresholds: Array<[number, string]> = [
            [4000, 'diamond'], [3000, 'platinum'], [2000, 'gold'], [1000, 'silver'],
          ];
          const newRank = rankThresholds.find(([t]) => newTotal >= t)?.[1] ?? 'bronze';
          const oldRank = userPoints?.current_rank ?? 'bronze';

          // Upsert user_points
          await serviceClient
            .from('user_points')
            .upsert(
              { user_id: order.user_id, total_points: newTotal, current_rank: newRank, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' },
            );

          // Record transaction
          await serviceClient
            .from('point_transactions')
            .insert({
              user_id: order.user_id,
              points: pointsToAward,
              action_type: 'buy_ticket',
              description: `Purchased ${order.quantity} ticket(s)`,
            });

          // Award voucher on rank-up
          if (newRank !== oldRank) {
            await serviceClient
              .from('user_vouchers')
              .insert({
                user_id: order.user_id,
                code: 'REWARD-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
                value_cents: 500,
                earned_at_rank: newRank,
                status: 'available',
                expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              });
          }
        } catch (e) {
          // Non-critical — log but don't fail
          console.warn('Failed to award points:', e);
        }

        console.log(`Order ${orderId} confirmed, ${tickets.length} tickets issued`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (!orderId) break;

        // Don't permanently fail — customer may retry. Just log it.
        // The reservation will expire naturally after 15 min if not retried.
        console.log(`Payment failed for order ${orderId} — reservation still active until expiry`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const pi = charge.payment_intent as string;
        if (!pi) break;

        // Find order by payment intent
        const { data: refundOrder } = await serviceClient
          .from('orders')
          .select('id, event_id, user_id')
          .eq('stripe_payment_intent_id', pi)
          .single();

        if (!refundOrder) {
          console.error('No order found for refunded charge PI:', pi);
          break;
        }

        // Update order status
        await serviceClient
          .from('orders')
          .update({ status: 'refunded', cancelled_at: new Date().toISOString() })
          .eq('id', refundOrder.id);

        // Invalidate all tickets for this order
        await serviceClient
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('order_id', refundOrder.id);

        // Record in refunds table
        await serviceClient
          .from('refunds')
          .insert({
            order_id: refundOrder.id,
            stripe_refund_id: charge.id,
            amount_cents: (charge.amount_refunded || 0),
            reason: 'charge.refunded webhook',
            status: 'succeeded',
            initiated_by: null,
          });

        console.log(`Order ${refundOrder.id} refunded, tickets cancelled`);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const stripeAccountId = account.id;

        // Update organiser_stripe_accounts with latest capability status
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
          console.error('Failed to update organiser stripe account:', updateErr);
        } else {
          console.log(`Updated stripe account ${stripeAccountId}: charges=${chargesEnabled}, payouts=${payoutsEnabled}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Record the event for idempotency
    await serviceClient
      .from('payment_events')
      .insert({
        order_id: (event.data.object as any)?.metadata?.order_id || null,
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event.data.object as any,
      });

  } catch (err) {
    console.error('Error processing webhook:', err);
    // Still return 200 to prevent Stripe from retrying indefinitely
    // The idempotency check will catch retries
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
