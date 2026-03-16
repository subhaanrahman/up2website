import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const schema = z.object({
  blocked_user_id: z.string().uuid('blocked_user_id must be a valid UUID'),
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

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { blocked_user_id } = parsed.data;

    if (blocked_user_id === user.id) {
      return errorResponse(400, 'Cannot block yourself', { requestId });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check if already blocked
    const { data: existing } = await serviceClient
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blocked_user_id)
      .maybeSingle();

    if (existing) {
      return successResponse({ success: true, already_blocked: true }, requestId);
    }

    const { error: insertError } = await serviceClient
      .from('blocked_users')
      .insert({ blocker_id: user.id, blocked_id: blocked_user_id });

    if (insertError) {
      edgeLog('error', 'Failed to block user', { requestId, error: String(insertError) });
      return errorResponse(500, 'Failed to block user', { requestId });
    }

    edgeLog('info', 'User blocked', { requestId, blockerId: user.id, blockedUserId: blocked_user_id });

    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog('error', 'moderation-block error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
