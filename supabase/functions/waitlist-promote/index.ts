import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { enqueueWaitlist, leaveWaitlist, promoteWaitlist } from "../_shared/waitlist-service.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const joinSchema = z.object({
  action: z.literal('join'),
  event_id: z.string().uuid(),
});

const leaveSchema = z.object({
  action: z.literal('leave'),
  event_id: z.string().uuid(),
});

const promoteSchema = z.object({
  action: z.literal('promote'),
  event_id: z.string().uuid(),
});

const bodySchema = z.discriminatedUnion('action', [joinSchema, leaveSchema, promoteSchema]);

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

    const allowed = await checkRateLimit('waitlist-promote', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const data = parsed.data;

    if (data.action === 'join') {
      const position = await enqueueWaitlist(serviceClient, data.event_id, user.id);
      return successResponse({ status: 'waitlisted', position }, requestId);
    }

    if (data.action === 'leave') {
      await leaveWaitlist(serviceClient, data.event_id, user.id);
      return successResponse({ success: true }, requestId);
    }

    // promote: only hosts/organiser owners/members can trigger
    const { data: event } = await serviceClient
      .from('events')
      .select('host_id, organiser_profile_id')
      .eq('id', data.event_id)
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

    const result = await promoteWaitlist(serviceClient, data.event_id);
    return successResponse({ success: true, promoted: result.promoted }, requestId);
  } catch (err) {
    edgeLog('error', 'waitlist-promote error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
