import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const querySchema = z.object({
  event_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const allowed = await checkRateLimit('orders-list', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all orders for event with profile data
    const { data: orders, error: ordersErr } = await serviceClient
      .from('orders')
      .select('id, user_id, quantity, amount_cents, currency, status, stripe_payment_intent_id, created_at, confirmed_at')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      return new Response(JSON.stringify({ error: ordersErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch profiles for all order user_ids
    const userIds = [...new Set((orders || []).map((o: any) => o.user_id))];
    let profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await serviceClient
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, email, phone')
        .in('user_id', userIds);
      profileData?.forEach((p: any) => { profiles[p.user_id] = p; });
    }

    // Fetch RSVPs for the event
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

    // Enrich with profile data
    const enrichedOrders = (orders || []).map((o: any) => ({
      ...o,
      profile: profiles[o.user_id] || null,
    }));

    const enrichedRsvps = (rsvps || []).map((r: any) => ({
      ...r,
      profile: profiles[r.user_id] || null,
    }));

    return new Response(JSON.stringify({ orders: enrichedOrders, rsvps: enrichedRsvps }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
