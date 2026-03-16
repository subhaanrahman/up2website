import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

// Module-level client (reused across warm invocations)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse(400, 'Invalid phone number', { requestId });
    }

    const digits = phone.replace(/[^0-9]/g, '');

    // Rate limit + phone lookup in PARALLEL
    const [rateLimitResult, profileResult] = await Promise.all([
      supabaseAdmin.rpc('check_rate_limit', {
        p_endpoint: 'check-phone',
        p_user_id: null,
        p_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req.headers.get('x-real-ip') ?? null,
        p_max_requests: 10,
        p_window_seconds: 60,
      }),
      supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`phone.eq.${digits},phone.eq.+${digits}`)
        .limit(1)
        .maybeSingle(),
    ]);

    if (rateLimitResult.data === false) {
      return errorResponse(429, 'Too many requests. Please try again later.', { requestId });
    }

    return successResponse({ exists: !!profileResult.data }, requestId);
  } catch (err) {
    edgeLog('error', 'check-phone error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
