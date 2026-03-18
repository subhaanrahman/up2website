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
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    type SignInResult =
      | { ok: true; access_token: string; refresh_token: string }
      | { ok: false; reason: "no_secret" | "no_phone" | "sign_in_failed" };

    const trySignInWithPassword = async (): Promise<SignInResult> => {
      const seedPw = Deno.env.get("SEED_USER_PASSWORD");
      if (!seedPw) {
        edgeLog("warn", "SEED_USER_PASSWORD not set", { requestId });
        return { ok: false, reason: "no_secret" };
      }
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("user_id", user_id)
        .maybeSingle();
      if (!profile?.phone) {
        edgeLog("warn", "No profile/phone for user_id", { requestId, user_id });
        return { ok: false, reason: "no_phone" };
      }
      const raw = profile.phone.replace(/\s/g, "");
      const phoneDigits = raw.replace(/\D/g, "");
      const phoneE164 = phoneDigits ? `+${phoneDigits}` : raw;
      for (const phoneFormat of [phoneDigits, phoneE164, raw]) {
        if (!phoneFormat) continue;
        const { data: signInData, error: signInErr } =
          await supabaseAnon.auth.signInWithPassword({
            phone: phoneFormat,
            password: seedPw,
          });
        if (!signInErr && signInData?.session) {
          edgeLog("info", `Dev login via signInWithPassword for ${user_id}`, { requestId });
          return {
            ok: true,
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
          };
        }
      }
      return { ok: false, reason: "sign_in_failed" };
    };

    // Try signInWithPassword first (works for seeded users; getUserById fails with "Database error loading user")
    const signInFirst = await trySignInWithPassword();
    if (signInFirst.ok) {
      return successResponse({
        success: true,
        access_token: signInFirst.access_token,
        refresh_token: signInFirst.refresh_token,
        user_id,
      }, requestId);
    }

    const { data: userData, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(user_id);

    if (getUserError || !userData?.user) {
      edgeLog("error", "getUserById failed, signInWithPassword also failed", {
        requestId,
        getUserError: String(getUserError),
        fallbackReason: signInFirst.reason,
      });
      const msg =
        signInFirst.reason === "no_secret"
          ? "SEED_USER_PASSWORD not set. Add it in Project Settings → Edge Functions → Secrets (set to seedplaceholder1)."
          : signInFirst.reason === "no_phone"
            ? "Profile missing phone for this user_id. Run auth_users_seed.sql then data_export.sql on the SAME project as VITE_SUPABASE_URL."
            : "User not found. Ensure VITE_SUPABASE_URL matches the project where you ran auth_users_seed.sql and data_export.sql.";
      return errorResponse(404, msg, { requestId });
    }

    const user = userData.user;

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: user.email!,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      edgeLog("error", "Generate link failed, trying signInWithPassword", {
        requestId,
        error: JSON.stringify(linkError),
      });
      const fallback = await trySignInWithPassword();
      if (fallback.ok) {
        return successResponse({
          success: true,
          access_token: fallback.access_token,
          refresh_token: fallback.refresh_token,
          user_id: user.id,
        }, requestId);
      }
      edgeLog("error", "Generate link fallback failed", { requestId, fallbackReason: fallback.reason });
      return errorResponse(500, "Failed to generate session", { requestId });
    }

    const { data: verifyData, error: verifyError } =
      await supabaseAnon.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

    if (verifyError || !verifyData?.session) {
      edgeLog("error", "Verify OTP failed, trying signInWithPassword", {
        requestId,
        error: JSON.stringify(verifyError),
      });
      const fallback = await trySignInWithPassword();
      if (fallback.ok) {
        return successResponse({
          success: true,
          access_token: fallback.access_token,
          refresh_token: fallback.refresh_token,
          user_id: user.id,
        }, requestId);
      }
      edgeLog("error", "Verify OTP fallback failed", { requestId, fallbackReason: fallback.reason });
      return errorResponse(500, "Failed to create session", { requestId });
    }

    edgeLog("info", `Dev login successful for user ${user_id}`, { requestId });

    return successResponse({
      success: true,
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      user_id: user.id,
    }, requestId);
  } catch (err) {
    edgeLog("error", "dev-login error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
