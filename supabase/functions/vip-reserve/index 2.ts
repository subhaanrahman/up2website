import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { isPaymentsDisabled, paymentsDisabledResponse } from "../_shared/payments-disabled.ts";

const reserveSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  vip_table_tier_id: z.string().uuid('Invalid VIP table tier ID'),
  guest_count: z.number().int().min(1).max(20).default(1),
  currency: z.string().length(3).default('zar'),
  special_requests: z.string().max(1000).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  if (isPaymentsDisabled()) {
    edgeLog('warn', 'vip-reserve blocked: PAYMENTS_DISABLED', { requestId });
    return paymentsDisabledResponse(requestId);
  }

  try {
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

    const allowed = await checkRateLimit('vip-reserve', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = reserveSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { event_id, vip_table_tier_id, guest_count, currency, special_requests } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: event, error: eventError } = await serviceClient
      .from('events')
      .select('id, status, vip_tables_enabled, organiser_profile_id, event_date, tickets_available_from, tickets_available_until')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return errorResponse(404, 'Event not found', { requestId });
    }

    if (event.status !== 'published') {
      return errorResponse(400, 'Event is not available for VIP reservations', { requestId });
    }

    if (!event.vip_tables_enabled) {
      return errorResponse(400, 'VIP tables are not enabled for this event', { requestId });
    }

    // Enforce optional sales window (aligns with tickets windows)
    const now = new Date();
    if (event.tickets_available_from) {
      const from = new Date(event.tickets_available_from);
      if (now < from) {
        return errorResponse(400, 'VIP reservations are not yet open', { requestId });
      }
    }
    const effectiveEnd = event.tickets_available_until
      ? new Date(event.tickets_available_until)
      : new Date(new Date(event.event_date).getTime() - 60 * 1000);
    if (now >= effectiveEnd) {
      return errorResponse(400, 'VIP reservations have ended', { requestId });
    }

    const { data: tier, error: tierError } = await serviceClient
      .from('vip_table_tiers')
      .select('id, min_spend_cents, available_quantity, max_guests, is_active')
      .eq('id', vip_table_tier_id)
      .eq('event_id', event_id)
      .maybeSingle();

    if (tierError || !tier) {
      return errorResponse(404, 'VIP table tier not found for this event', { requestId });
    }

    if (!tier.is_active) {
      return errorResponse(400, 'VIP table tier is not active', { requestId });
    }

    if (guest_count > tier.max_guests) {
      return errorResponse(400, `Guest count exceeds table limit (${tier.max_guests})`, { requestId });
    }

    const { data: reservationRows } = await serviceClient
      .from('vip_table_reservations')
      .select('id, status, expires_at')
      .eq('event_id', event_id)
      .eq('vip_table_tier_id', vip_table_tier_id)
      .in('status', ['reserved', 'confirmed']);

    const activeReservations = (reservationRows || []).filter((r: any) =>
      r.status === 'confirmed' || (r.status === 'reserved' && new Date(r.expires_at) > new Date()),
    );

    if (activeReservations.length >= tier.available_quantity) {
      return errorResponse(409, 'This VIP table tier is sold out', { requestId });
    }

    const { data: existingReservation } = await serviceClient
      .from('vip_table_reservations')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .in('status', ['reserved', 'confirmed'])
      .maybeSingle();

    if (existingReservation) {
      return errorResponse(409, 'You already have an active VIP reservation for this event', { requestId, details: { reservation_id: existingReservation.id } });
    }

    const amount_cents = tier.min_spend_cents;
    const platform_fee_cents = Math.round(amount_cents * 0.07);
    const total_amount_cents = amount_cents + platform_fee_cents;

    if (amount_cents > 0) {
      if (!event.organiser_profile_id) {
        return errorResponse(400, 'VIP reservations require an organiser with payout setup', { requestId });
      }
      const { data: stripeAcct } = await serviceClient
        .from('organiser_stripe_accounts')
        .select('charges_enabled')
        .eq('organiser_profile_id', event.organiser_profile_id)
        .maybeSingle();

      if (!stripeAcct || !stripeAcct.charges_enabled) {
        return errorResponse(400, 'This organiser has not completed payout setup. VIP reservations cannot be purchased yet.', { requestId });
      }
    }

    const { data: reservation, error: insertErr } = await serviceClient
      .from('vip_table_reservations')
      .insert({
        event_id,
        vip_table_tier_id,
        user_id: user.id,
        guest_count,
        status: 'reserved',
        amount_cents: total_amount_cents,
        platform_fee_cents,
        currency,
        special_requests: special_requests ?? null,
      })
      .select('id, amount_cents, platform_fee_cents, expires_at')
      .single();

    if (insertErr || !reservation) {
      edgeLog('error', 'VIP reservation insert failed', { requestId, error: String(insertErr) });
      return errorResponse(500, 'Failed to create VIP reservation', { requestId });
    }

    return successResponse({
      reservation_id: reservation.id,
      amount_cents: reservation.amount_cents,
      platform_fee_cents: reservation.platform_fee_cents,
      expires_at: reservation.expires_at,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'vip-reserve error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
