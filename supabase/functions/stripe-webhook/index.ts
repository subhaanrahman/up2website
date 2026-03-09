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

        // Award loyalty points
        try {
          await serviceClient.rpc('award_points', {
            p_action_type: 'buy_ticket',
            p_description: `Purchased ${order.quantity} ticket(s)`,
          });
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

        await serviceClient
          .from('orders')
          .update({ status: 'failed' })
          .eq('id', orderId)
          .eq('status', 'reserved'); // Only fail if still reserved

        console.log(`Order ${orderId} marked as failed`);
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
