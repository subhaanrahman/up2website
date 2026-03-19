import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

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

  const requestId = getRequestId(req);

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Not authenticated', { requestId });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Invalid token', { requestId });
    }

    // Rate limit
    const allowed = await checkRateLimit('orders-reserve', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    // Validate input
    const body = await req.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { event_id, ticket_tier_id, quantity, currency } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify event exists, is published, and get canonical price
    const { data: event, error: eventError } = await serviceClient
      .from('events')
      .select('id, max_guests, title, ticket_price_cents, status, event_date, tickets_available_from, tickets_available_until')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return errorResponse(404, 'Event not found', { requestId });
    }

    // Only allow purchases for published events
    if (event.status !== 'published') {
      return errorResponse(400, 'Event is not available for ticket sales', { requestId });
    }

    // Enforce ticket sales window
    const now = new Date();
    if (event.tickets_available_from) {
      const from = new Date(event.tickets_available_from);
      if (now < from) {
        return errorResponse(400, 'Ticket sales not yet open', { requestId });
      }
    }
    const effectiveEnd = event.tickets_available_until
      ? new Date(event.tickets_available_until)
      : new Date(new Date(event.event_date).getTime() - 60 * 1000);
    if (now >= effectiveEnd) {
      return errorResponse(400, 'Ticket sales have ended', { requestId });
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
        return errorResponse(404, 'Ticket tier not found for this event', { requestId });
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
          return errorResponse(409, 'This ticket tier is sold out', { requestId });
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
          return errorResponse(400, 'This organiser has not completed payout setup. Tickets cannot be purchased yet.', { requestId });
        }
      } else {
        return errorResponse(400, 'Paid events require an organiser with payout setup', { requestId });
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
        return errorResponse(409, 'Not enough capacity for this event', { requestId });
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
      return errorResponse(409, 'You already have an active reservation for this event', { requestId, details: { order_id: existingOrder.id } });
    }

    // platform_fee_cents = service fee (7%) passed as application_fee_amount to Stripe
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
      edgeLog('error', 'Order insert error', { requestId, error: String(insertError) });
      return errorResponse(500, 'Failed to create reservation', { requestId });
    }

    return new Response(JSON.stringify({ ...order, request_id: requestId }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
