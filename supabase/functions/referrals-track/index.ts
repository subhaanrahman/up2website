import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const inputSchema = z.object({
  action: z.enum(['share', 'click', 'view']),
  event_id: z.string().uuid(),
  channel: z.string().optional(),
  session_id: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      } catch { /* ignore */ }
    }

    const allowed = await checkRateLimit('referrals-track', userId, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { action, event_id, channel, session_id } = parsed.data;

    if ((action === 'click' || action === 'view') && !session_id) {
      return errorResponse(400, 'session_id is required', { requestId });
    }

    if ((action === 'share' || action === 'click') && !channel) {
      return errorResponse(400, 'channel is required', { requestId });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (action === 'view') {
      const { error } = await serviceClient
        .from('event_views')
        .upsert(
          { event_id, session_id, view_date: new Date().toISOString().slice(0, 10) },
          { onConflict: 'event_id,session_id,view_date' },
        );
      if (error) {
        edgeLog('error', 'event view insert failed', { requestId, error: error.message });
        return errorResponse(500, 'Failed to track view', { requestId });
      }
      return successResponse({ success: true }, requestId);
    }

    const { data, error } = await serviceClient
      .from('event_link_clicks')
      .insert({
        event_id,
        user_id: userId,
        session_id: session_id ?? null,
        action,
        channel,
      })
      .select('id')
      .single();

    if (error) {
      edgeLog('error', 'event link insert failed', { requestId, error: error.message });
      return errorResponse(500, 'Failed to track link', { requestId });
    }

    if (action === 'click') {
      return successResponse({ click_id: data?.id }, requestId);
    }

    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog('error', 'referrals-track error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
