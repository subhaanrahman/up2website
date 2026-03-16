import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") {
      return errorResponse(400, "user_id required", { requestId });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return errorResponse(400, "Invalid user_id format", { requestId });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) throw error;

    return successResponse(data, requestId);
  } catch (err) {
    edgeLog('error', 'dev-profile error', { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
