import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const bodySchema = z.object({
  event_id: z.string().uuid(),
  message: z.string().min(1).max(1000),
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

    const allowed = await checkRateLimit('attendee-broadcast', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten() });
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
      return errorResponse(404, 'Event not found', { requestId });
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
      return errorResponse(403, 'Not authorized', { requestId });
    }

    // Get all attendees (RSVP going + ticket holders)
    const [rsvpRes, ticketRes] = await Promise.all([
      serviceClient.from('rsvps').select('user_id').eq('event_id', event_id).eq('status', 'going'),
      serviceClient.from('tickets').select('user_id').eq('event_id', event_id).eq('status', 'valid'),
    ]);

    const attendeeIds = new Set<string>();
    (rsvpRes.data || []).forEach((r) => attendeeIds.add(r.user_id));
    (ticketRes.data || []).forEach((t) => attendeeIds.add(t.user_id));
    attendeeIds.delete(user.id);

    if (attendeeIds.size === 0) {
      return errorResponse(400, 'No attendees to message', { requestId });
    }

    const notifications = Array.from(attendeeIds).map((uid) => ({
      user_id: uid,
      title: `Message from ${event.title}`,
      message,
      type: 'event_update',
      link: `/events/${event_id}`,
    }));

    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await serviceClient.from('notifications').insert(batch);
    }

    return successResponse({ success: true, recipients: attendeeIds.size }, requestId);
  } catch (err) {
    edgeLog('error', 'Attendee broadcast error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
