import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const querySchema = z.object({
  event_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

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

    const allowed = await checkRateLimit('orders-list', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId });
    }

    const { event_id } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is host or organiser owner/member
    const { data: event } = await serviceClient
      .from('events')
      .select('id, host_id, organiser_profile_id')
      .eq('id', event_id)
      .maybeSingle();

    if (!event) {
      return errorResponse(404, 'Event not found', { requestId });
    }

    let isAuthorized = event.host_id === user.id;
    if (!isAuthorized && event.organiser_profile_id) {
      const [orgResult, memberResult] = await Promise.all([
        serviceClient.from('organiser_profiles').select('owner_id').eq('id', event.organiser_profile_id).maybeSingle(),
        serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', event.organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
      ]);
      if (orgResult.data?.owner_id === user.id || memberResult.data) isAuthorized = true;
    }

    if (!isAuthorized) {
      return errorResponse(403, 'Not authorized', { requestId });
    }

    const { data: orders, error: ordersErr } = await serviceClient
      .from('orders')
      .select('id, user_id, quantity, amount_cents, currency, status, stripe_payment_intent_id, created_at, confirmed_at')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      return errorResponse(500, ordersErr.message, { requestId });
    }

    const orderIds = (orders || []).map((o: any) => o.id).filter(Boolean);
    const refundsByOrderId: Record<string, any[]> = {};
    if (orderIds.length > 0) {
      const { data: refundRows, error: refundsErr } = await serviceClient
        .from('refunds')
        .select('id, order_id, stripe_refund_id, amount_cents, reason, status, initiated_by, created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });
      if (refundsErr) {
        return errorResponse(500, refundsErr.message, { requestId });
      }
      for (const row of refundRows || []) {
        const oid = row.order_id as string;
        if (!refundsByOrderId[oid]) refundsByOrderId[oid] = [];
        refundsByOrderId[oid].push(row);
      }
    }

    const userIds = [...new Set((orders || []).map((o: any) => o.user_id))];
    let profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await serviceClient
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, email, phone')
        .in('user_id', userIds);
      profileData?.forEach((p: any) => { profiles[p.user_id] = p; });
    }

    const { data: rsvps } = await serviceClient
      .from('rsvps')
      .select('id, user_id, status, created_at')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false });

    const { data: vipReservations, error: vipErr } = await serviceClient
      .from('vip_table_reservations')
      .select('id, user_id, vip_table_tier_id, guest_count, status, amount_cents, currency, created_at, confirmed_at, cancelled_at, stripe_payment_intent_id')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false });

    if (vipErr) {
      return errorResponse(500, vipErr.message, { requestId });
    }

    const rsvpUserIds = [...new Set((rsvps || []).map((r: any) => r.user_id))];
    const vipUserIds = [...new Set((vipReservations || []).map((r: any) => r.user_id))];
    const missingIds = rsvpUserIds.filter((id: string) => !profiles[id]);
    const missingVipIds = vipUserIds.filter((id: string) => !profiles[id] && !missingIds.includes(id));
    if (missingIds.length > 0) {
      const { data: extraProfiles } = await serviceClient
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, email, phone')
        .in('user_id', missingIds);
      extraProfiles?.forEach((p: any) => { profiles[p.user_id] = p; });
    }
    if (missingVipIds.length > 0) {
      const { data: extraProfiles } = await serviceClient
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, email, phone')
        .in('user_id', missingVipIds);
      extraProfiles?.forEach((p: any) => { profiles[p.user_id] = p; });
    }

    const vipTierIds = [...new Set((vipReservations || []).map((r: any) => r.vip_table_tier_id).filter(Boolean))];
    let vipTiers: Record<string, any> = {};
    if (vipTierIds.length > 0) {
      const { data: vipTierRows } = await serviceClient
        .from('vip_table_tiers')
        .select('id, name')
        .in('id', vipTierIds);
      vipTierRows?.forEach((t: any) => { vipTiers[t.id] = t; });
    }

    const vipReservationIds = (vipReservations || []).map((r: any) => r.id);
    let vipRefundMap: Record<string, any> = {};
    if (vipReservationIds.length > 0) {
      const { data: vipRefunds } = await serviceClient
        .from('vip_refunds')
        .select('id, vip_reservation_id, amount_cents, reason, status, stripe_refund_id, created_at')
        .in('vip_reservation_id', vipReservationIds)
        .order('created_at', { ascending: false });
      vipRefunds?.forEach((refund: any) => {
        if (!vipRefundMap[refund.vip_reservation_id]) {
          vipRefundMap[refund.vip_reservation_id] = refund;
        }
      });
    }

    const enrichedOrders = (orders || []).map((o: any) => ({
      ...o,
      profile: profiles[o.user_id] || null,
      refunds: refundsByOrderId[o.id] || [],
    }));

    const enrichedRsvps = (rsvps || []).map((r: any) => ({
      ...r,
      profile: profiles[r.user_id] || null,
    }));

    const enrichedVipReservations = (vipReservations || []).map((r: any) => ({
      ...r,
      profile: profiles[r.user_id] || null,
      tier: r.vip_table_tier_id ? vipTiers[r.vip_table_tier_id] || null : null,
      refund: vipRefundMap[r.id] || null,
    }));

    return successResponse({ orders: enrichedOrders, rsvps: enrichedRsvps, vip_reservations: enrichedVipReservations }, requestId);
  } catch (err) {
    edgeLog('error', 'orders-list error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
