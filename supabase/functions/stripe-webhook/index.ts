import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

// Register all job handlers before any enqueue() calls
import "../_shared/job-handlers.ts";
import { enqueue } from "../_shared/queue.ts";
import type {
  TicketsIssuePayload,
  AutoRsvpPayload,
  LoyaltyAwardPayload,
} from "../_shared/queue.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Stripe Webhook handler
 * Side-effects (tickets, RSVP, loyalty) are dispatched via the queue abstraction.
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

  // Idempotency check
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

        const { data: order, error: orderErr } = await serviceClient
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderErr || !order) {
          console.error('Order not found:', orderId);
          break;
        }

        if (order.status !== 'reserved') {
          console.log(`Order ${orderId} already ${order.status}, skipping`);
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

        console.log(`Order ${orderId} confirmed, side-effects enqueued`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (!orderId) break;
        console.log(`Payment failed for order ${orderId} — reservation still active until expiry`);
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
          console.error('No order found for refunded charge PI:', pi);
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

    // Record for idempotency
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
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
