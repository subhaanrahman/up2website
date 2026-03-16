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

    const rsvpUserIds = [...new Set((rsvps || []).map((r: any) => r.user_id))];
    const missingIds = rsvpUserIds.filter((id: string) => !profiles[id]);
    if (missingIds.length > 0) {
      const { data: extraProfiles } = await serviceClient
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, email, phone')
        .in('user_id', missingIds);
      extraProfiles?.forEach((p: any) => { profiles[p.user_id] = p; });
    }

    const enrichedOrders = (orders || []).map((o: any) => ({
      ...o,
      profile: profiles[o.user_id] || null,
    }));

    const enrichedRsvps = (rsvps || []).map((r: any) => ({
      ...r,
      profile: profiles[r.user_id] || null,
    }));

    return successResponse({ orders: enrichedOrders, rsvps: enrichedRsvps }, requestId);
  } catch (err) {
    edgeLog('error', 'orders-list error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
