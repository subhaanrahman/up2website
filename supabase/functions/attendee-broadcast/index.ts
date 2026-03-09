import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const bodySchema = z.object({
  event_id: z.string().uuid(),
  message: z.string().min(1).max(1000),
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

    const allowed = await checkRateLimit('attendee-broadcast', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event_id, message } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is host or organiser owner/member
    const { data: event } = await serviceClient
      .from('events')
      .select('id, host_id, organiser_profile_id, title')
      .eq('id', event_id)
      .maybeSingle();

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let isAuthorized = event.host_id === user.id;
    if (!isAuthorized && event.organiser_profile_id) {
      const [ownerCheck, memberCheck] = await Promise.all([
        serviceClient.from('organiser_profiles').select('owner_id').eq('id', event.organiser_profile_id).maybeSingle(),
        serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', event.organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
      ]);
      isAuthorized = ownerCheck.data?.owner_id === user.id || !!memberCheck.data;
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all attendees (RSVP going + ticket holders)
    const [rsvpRes, ticketRes] = await Promise.all([
      serviceClient.from('rsvps').select('user_id').eq('event_id', event_id).eq('status', 'going'),
      serviceClient.from('tickets').select('user_id').eq('event_id', event_id).eq('status', 'valid'),
    ]);

    const attendeeIds = new Set<string>();
    (rsvpRes.data || []).forEach((r) => attendeeIds.add(r.user_id));
    (ticketRes.data || []).forEach((t) => attendeeIds.add(t.user_id));
    // Remove the sender
    attendeeIds.delete(user.id);

    if (attendeeIds.size === 0) {
      return new Response(JSON.stringify({ error: 'No attendees to message' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create notifications for all attendees
    const notifications = Array.from(attendeeIds).map((uid) => ({
      user_id: uid,
      title: `Message from ${event.title}`,
      message,
      type: 'event_update',
      link: `/events/${event_id}`,
    }));

    // Insert in batches of 100
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await serviceClient.from('notifications').insert(batch);
    }

    return new Response(JSON.stringify({ success: true, recipients: attendeeIds.size }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Attendee broadcast error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
