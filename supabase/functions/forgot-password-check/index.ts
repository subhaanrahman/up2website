import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { toE164 } from "../_shared/phone.ts";

function maskEmail(email: string): string {
  if (!email || email.length < 5) return "***";
  const [local, domain] = email.split("@");
  if (!domain) return local[0] + "***";
  const maskedLocal = local.length <= 2 ? local[0] + "***" : local[0] + "***" + local[local.length - 1];
  const [name, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");
  const maskedDomain = name.length <= 2 ? name + "***" : name.slice(0, 2) + "***." + tld;
  return `${maskedLocal}@${maskedDomain}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit("forgot-password-check", null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const { phone, code } = body ?? {};
    if (!phone || typeof phone !== "string" || phone.length < 8) {
      return errorResponse(400, "Invalid phone number", { requestId });
    }
    if (!code || typeof code !== "string" || code.length !== 6) {
      return errorResponse(400, "Invalid verification code", { requestId });
    }

    const phoneE164 = toE164(phone);

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const serviceSid = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");
    if (!accountSid || !authToken || !serviceSid) {
      return errorResponse(500, "SMS service not configured", { requestId });
    }

    const credentials = btoa(`${accountSid}:${authToken}`);
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phoneE164, Code: code }),
      }
    );
    const twilioData = await twilioRes.json();

    if (!twilioRes.ok || twilioData.status !== "approved") {
      edgeLog("error", "Twilio verify failed", { requestId, twilioData: JSON.stringify(twilioData) });
      return errorResponse(400, "Invalid or expired verification code", { requestId });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const phoneDigits = phoneE164.replace(/\D/g, "");
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, email, email_verified")
      .or(`phone.eq.${phoneDigits},phone.eq.+${phoneDigits}`)
      .limit(1)
      .maybeSingle();

    if (!profile?.user_id) {
      return errorResponse(404, "No account found for this phone number", { requestId });
    }

    const hasVerifiedEmail = !!(profile.email && profile.email_verified);
    const maskedEmail = hasVerifiedEmail && profile.email ? maskEmail(profile.email) : undefined;
    const email = hasVerifiedEmail && profile.email ? profile.email : undefined;

    const resetToken = crypto.randomUUID() + "-" + crypto.randomUUID().slice(0, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("password_reset_tokens").insert({
      user_id: profile.user_id,
      token: resetToken,
      expires_at: expiresAt,
    });

    if (insertErr) {
      edgeLog("error", "Failed to create reset token", { requestId, error: insertErr.message });
      return errorResponse(500, "Failed to create reset session", { requestId });
    }

    return successResponse(
      { hasVerifiedEmail, maskedEmail, email, resetToken },
      requestId
    );
  } catch (err) {
    edgeLog("error", "forgot-password-check error", { requestId, error: String(err) });
    return errorResponse(500, "Internal server error", { requestId });
  }
});
