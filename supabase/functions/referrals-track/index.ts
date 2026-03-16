import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

// Stub — not yet implemented, but rate-limited
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  // Even stubs should be rate-limited to prevent abuse
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

  return errorResponse(501, 'Not implemented yet', { requestId });
});
