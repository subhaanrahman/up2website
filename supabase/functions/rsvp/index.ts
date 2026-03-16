import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const rsvpSchema = z.object({
  action: z.enum(['join', 'leave']),
  event_id: z.string().uuid('event_id must be a valid UUID'),
  status: z.enum(['going', 'maybe']).optional().default('going'),
  guest_count: z.number().int().min(1).max(5).optional().default(1),
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

    // Rate limit
    const allowed = await checkRateLimit('rsvp', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();

    // Validate input
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { action, event_id, status, guest_count } = parsed.data;

    if (action === 'join') {
      const { data, error } = await supabase.rpc('rsvp_join', {
        p_event_id: event_id,
        p_status: status,
        p_guest_count: guest_count,
      });

      if (error) {
        const status_code = error.message.includes('capacity') ? 400
          : error.message.includes('not found') ? 404
          : error.message.includes('access') ? 403
          : 400;
        return errorResponse(status_code, error.message, { requestId });
      }

      return successResponse(data, requestId);

    } else {
      const { data, error } = await supabase.rpc('rsvp_leave', {
        p_event_id: event_id,
      });

      if (error) {
        return errorResponse(400, error.message, { requestId });
      }

      return successResponse(data, requestId);
    }
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
