import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const schema = z.object({
  event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.enum(['check_in', 'check_out']),
  method: z.enum(['manual', 'qr']).default('manual'),
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

    const allowed = await checkRateLimit('checkin-toggle', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { event_id, user_id: targetUserId, action, method } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is authorized (host, org owner, or org member)
    const { data: event, error: fetchErr } = await serviceClient
      .from('events')
      .select('id, host_id, organiser_profile_id')
      .eq('id', event_id)
      .maybeSingle();

    if (fetchErr || !event) {
      return errorResponse(404, 'Event not found', { requestId });
    }

    let isAuthorized = event.host_id === user.id;

    if (!isAuthorized && event.organiser_profile_id) {
      const [orgResult, memberResult] = await Promise.all([
        serviceClient.from('organiser_profiles').select('owner_id').eq('id', event.organiser_profile_id).maybeSingle(),
        serviceClient.from('organiser_members').select('id').eq('organiser_profile_id', event.organiser_profile_id).eq('user_id', user.id).eq('status', 'accepted').maybeSingle(),
      ]);
      if (orgResult.data?.owner_id === user.id || memberResult.data) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse(403, 'Not authorized', { requestId });
    }

    if (action === 'check_in') {
      const { data, error } = await serviceClient
        .from('check_ins')
        .upsert({
          event_id,
          user_id: targetUserId,
          checked_in_by: user.id,
          method,
          checked_in_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' })
        .select()
        .single();

      if (error) {
        return errorResponse(400, error.message, { requestId });
      }

      return successResponse({ success: true, check_in: data }, requestId);
    }

    // check_out
    const { error: delErr } = await serviceClient
      .from('check_ins')
      .delete()
      .eq('event_id', event_id)
      .eq('user_id', targetUserId);

    if (delErr) {
      return errorResponse(400, delErr.message, { requestId });
    }

    return successResponse({ success: true, checked_out: true }, requestId);
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
