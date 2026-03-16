import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  return successResponse({ ok: true, timestamp: new Date().toISOString() }, requestId);
});
