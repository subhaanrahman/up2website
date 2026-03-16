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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(user_id);

    if (getUserError || !userData?.user) {
      return errorResponse(404, "User not found", { requestId });
    }

    const user = userData.user;

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: user.email!,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      edgeLog('error', 'Generate link error', { requestId, error: JSON.stringify(linkError) });
      return errorResponse(500, "Failed to generate session", { requestId });
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: verifyData, error: verifyError } =
      await supabaseAnon.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

    if (verifyError || !verifyData?.session) {
      edgeLog('error', 'Verify OTP error', { requestId, error: JSON.stringify(verifyError) });
      return errorResponse(500, "Failed to create session", { requestId });
    }

    edgeLog('info', `Dev login successful for user ${user_id}`, { requestId });

    return successResponse({
      success: true,
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      user_id: user.id,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'dev-login error', { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
