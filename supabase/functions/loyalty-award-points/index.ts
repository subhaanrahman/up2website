import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

// Must match the hardcoded action types in the award_points DB function
const VALID_ACTION_TYPES = [
  'add_friend', 'save_event', 'like_post', 'follow_organiser',
  'share_event', 'rsvp_event', 'buy_ticket', 'create_event', 'app_review',
] as const;

const awardPointsSchema = z.object({
  action_type: z.enum(VALID_ACTION_TYPES),
  description: z.string().trim().max(200).nullish(),
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

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return errorResponse(401, 'Invalid token', { requestId });
    }

    // Rate limit
    const allowed = await checkRateLimit('loyalty-award-points', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();

    // Validate input
    const parsed = awardPointsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { action_type, description } = parsed.data;

    // Call RPC with user's auth context
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: result, error: rpcError } = await userClient.rpc('award_points', {
      p_action_type: action_type,
      p_description: description || null,
    });

    if (rpcError) {
      edgeLog('error', 'RPC error', { requestId, error: String(rpcError) });
      return errorResponse(400, rpcError.message, { requestId });
    }

    return successResponse(result, requestId);
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
