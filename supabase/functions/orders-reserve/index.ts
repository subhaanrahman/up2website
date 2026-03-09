import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const reserveSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  ticket_tier_id: z.string().uuid('Invalid ticket tier ID').optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  currency: z.string().length(3).default('zar'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const allowed = await checkRateLimit('orders-reserve', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    // Validate input
    const body = await req.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event_id, ticket_tier_id, quantity, currency } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify event exists, is published, and get canonical price
    const { data: event, error: eventError } = await serviceClient
      .from('events')
      .select('id, max_guests, title, ticket_price_cents, status')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only allow purchases for published events
    if (event.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Event is not available for ticket sales' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Derive price from ticket tier (preferred) or fallback to event price
    let amount_cents: number;
    let resolved_tier_id: string | null = ticket_tier_id || null;

    if (ticket_tier_id) {
      const { data: tier, error: tierError } = await serviceClient
        .from('ticket_tiers')
        .select('id, price_cents, available_quantity')
        .eq('id', ticket_tier_id)
        .eq('event_id', event_id)
        .single();

      if (tierError || !tier) {
        return new Response(JSON.stringify({ error: 'Ticket tier not found for this event' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check tier-level inventory — SUM(quantity) not COUNT(*)
      if (tier.available_quantity !== null) {
        const { data: soldRows } = await serviceClient
          .from('orders')
          .select('quantity')
          .eq('event_id', event_id)
          .eq('ticket_tier_id', ticket_tier_id)
          .in('status', ['reserved', 'confirmed'])
          .gt('expires_at', new Date().toISOString());

        const tierSoldQty = (soldRows ?? []).reduce((sum: number, r: any) => sum + (r.quantity ?? 0), 0);
        if (tierSoldQty + quantity > tier.available_quantity) {
          return new Response(JSON.stringify({ error: 'This ticket tier is sold out' }), {
            status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      amount_cents = tier.price_cents * quantity;
    } else {
      amount_cents = event.ticket_price_cents * quantity;
    }

    // Calculate platform service fee (7%) — charged ON TOP of ticket price
    const service_fee_cents = Math.round(amount_cents * 0.07);
    // Total customer pays = ticket price + service fee
    const total_amount_cents = amount_cents + service_fee_cents;

    // For paid events with an organiser, verify Stripe Connect is ready
    if (amount_cents > 0) {
      const { data: eventFull } = await serviceClient
        .from('events')
        .select('organiser_profile_id')
        .eq('id', event_id)
        .single();

      if (eventFull?.organiser_profile_id) {
        const { data: stripeAcct } = await serviceClient
          .from('organiser_stripe_accounts')
          .select('charges_enabled')
          .eq('organiser_profile_id', eventFull.organiser_profile_id)
          .maybeSingle();

        if (!stripeAcct || !stripeAcct.charges_enabled) {
          return new Response(JSON.stringify({ error: 'This organiser has not completed payout setup. Tickets cannot be purchased yet.' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Paid event without an organiser profile — should not happen, but block it
        return new Response(JSON.stringify({ error: 'Paid events require an organiser with payout setup' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check overall event capacity — only count orders (not RSVPs)
    // because confirmed orders auto-create RSVPs which would double-count
    if (event.max_guests) {
      const { data: orderRows } = await serviceClient
        .from('orders')
        .select('quantity')
        .eq('event_id', event_id)
        .in('status', ['reserved', 'confirmed'])
        .gt('expires_at', new Date().toISOString());

      // Also count free RSVPs (those without a matching confirmed order)
      const { count: freeRsvpCount } = await serviceClient
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('status', 'going');

      // Subtract confirmed orders from RSVP count to avoid double-counting
      const { count: confirmedOrderCount } = await serviceClient
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('status', 'confirmed');

      const orderQty = (orderRows ?? []).reduce((sum: number, r: any) => sum + (r.quantity ?? 0), 0);
      const pureRsvps = Math.max(0, (freeRsvpCount ?? 0) - (confirmedOrderCount ?? 0));
      const totalOccupied = orderQty + pureRsvps;
      if (totalOccupied + quantity > event.max_guests) {
        return new Response(JSON.stringify({ error: 'Not enough capacity for this event' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check for existing active reservation by this user for this event
    const { data: existingOrder } = await serviceClient
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .eq('status', 'reserved')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({ error: 'You already have an active reservation for this event', order_id: existingOrder.id }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate platform fee (10%)
    // NOTE: platform_fee_cents = service fee passed as application_fee_amount to Stripe
    // amount_cents on the order = total customer charge (ticket + service fee)
    const platform_fee_cents = service_fee_cents;

    // Create reservation (15-minute hold)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: order, error: insertError } = await serviceClient
      .from('orders')
      .insert({
        user_id: user.id,
        event_id,
        ticket_tier_id: resolved_tier_id,
        quantity,
        amount_cents: total_amount_cents,
        platform_fee_cents,
        currency,
        status: 'reserved',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Order insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create reservation' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(order), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
