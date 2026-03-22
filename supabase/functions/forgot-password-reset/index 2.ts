import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit("forgot-password-reset", null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const { resetToken, newPassword } = body ?? {};
    if (!resetToken || typeof resetToken !== "string" || resetToken.length < 16) {
      return errorResponse(400, "Invalid or expired session. Please start over.", { requestId });
    }
    if (!newPassword || typeof newPassword !== "string") {
      return errorResponse(400, "Password is required", { requestId });
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      return errorResponse(
        400,
        "Password must be 8+ characters with at least 1 letter, 1 number, and 1 special character",
        { requestId }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokenRow, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("user_id, expires_at")
      .eq("token", resetToken)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      edgeLog("error", "Token lookup failed", { requestId, error: String(tokenError) });
      return errorResponse(400, "Session expired. Please start over.", { requestId });
    }

    const expiresAt = new Date(tokenRow.expires_at);
    if (expiresAt < new Date()) {
      await supabase
        .from("password_reset_tokens")
        .delete()
        .eq("token", resetToken);
      return errorResponse(400, "Session expired. Please start over.", { requestId });
    }

    // Try Admin API first — works for normal users (GoTrue-native hash, signInWithPassword succeeds).
    // Falls back to RPC for seeded users (Admin API fails with "Database error loading user").
    const { error: adminError } = await supabase.auth.admin.updateUserById(tokenRow.user_id, {
      password: newPassword,
    });

    if (adminError) {
      edgeLog("warn", "Admin API failed, trying RPC", { requestId, error: adminError.message });
      const { error: rpcError } = await supabase.rpc("update_auth_user_password", {
        p_user_id: tokenRow.user_id,
        p_new_password: newPassword,
      });
      if (rpcError) {
        await supabase.from("password_reset_tokens").delete().eq("token", resetToken);
        return errorResponse(
          500,
          `Failed to update password. Admin API: ${adminError.message || "unknown"}. RPC: ${rpcError.message || "unknown"}. If RPC says "could not find the function", run NOTIFY pgrst, 'reload schema'; in SQL Editor.`,
          { requestId }
        );
      }
    }

    await supabase.from("password_reset_tokens").delete().eq("token", resetToken);
    return successResponse({ success: true }, requestId);
  } catch (err) {
    edgeLog("error", "forgot-password-reset error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
