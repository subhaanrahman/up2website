import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

// Module-level client (reused across warm invocations)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

/** Digit-only form for auth.users / RPC matching */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** E.164: +digits */
function toE164(phone: string): string {
  const d = digitsOnly(phone);
  return d ? `+${d}` : phone.trim();
}

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

    const digits = digitsOnly(phone);
    const e164 = toE164(phone);

    // Rate limit + lookups in parallel
    const [rateLimitResult, profileResult, authRpcResult] = await Promise.all([
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
        .select('user_id')
        .in('phone', [...new Set([e164, digits, `+${digits}`].filter(Boolean))])
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.rpc('phone_registered_in_auth', { p_digits: digits }),
    ]);

    if (rateLimitResult.data === false) {
      return errorResponse(429, 'Too many requests. Please try again later.', { requestId });
    }

    const inProfiles = !!profileResult.data;
    if (authRpcResult.error) {
      edgeLog('warn', 'phone_registered_in_auth RPC failed (apply migration 20260328120000?)', {
        requestId,
        err: authRpcResult.error.message,
      });
    }
    const inAuth = authRpcResult.error ? false : authRpcResult.data === true;

    const exists = inProfiles || inAuth;

    return successResponse({ exists }, requestId);
  } catch (err) {
    edgeLog('error', 'check-phone error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
