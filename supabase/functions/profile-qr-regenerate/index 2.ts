import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(401, "Not authenticated", { requestId });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Invalid token", { requestId });
    }

    const allowed = await checkRateLimit("profile-qr-regenerate", user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const newQrCode = "PID-" + crypto.randomUUID().replace(/-/g, "");

    const { error: profileErr } = await serviceClient
      .from("profiles")
      .update({ qr_code: newQrCode, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (profileErr) {
      edgeLog("error", "profile-qr-regenerate profile update failed", { requestId, error: String(profileErr) });
      return errorResponse(500, "Failed to regenerate digital ID", { requestId });
    }

    const { error: ticketsErr } = await serviceClient
      .from("tickets")
      .update({ qr_code: newQrCode })
      .eq("user_id", user.id);

    if (ticketsErr) {
      edgeLog("warn", "profile-qr-regenerate tickets update failed (non-fatal)", { requestId, error: String(ticketsErr) });
    }

    edgeLog("info", "Profile QR regenerated", { requestId, user_id: user.id });
    return successResponse({ qr_code: newQrCode }, requestId);
  } catch (err) {
    edgeLog("error", "profile-qr-regenerate error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
