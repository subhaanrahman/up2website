import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const supabaseAnon = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

/**
 * Verify OTP with Twilio.
 * - New user: returns { verified: true }. Account creation happens in /register.
 * - Returning user: verifies OTP, creates session, returns { verified: true, access_token, refresh_token }.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit('verify-otp', null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone, code } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse(400, 'Invalid phone number', { requestId });
    }
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return errorResponse(400, 'Invalid verification code', { requestId });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!accountSid || !authToken || !serviceSid) {
      return errorResponse(500, 'SMS service not configured', { requestId });
    }

    // Verify OTP with Twilio Verify
    const credentials = btoa(`${accountSid}:${authToken}`);
    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, Code: code }),
      },
    );

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok || twilioData.status !== 'approved') {
      edgeLog('error', 'Twilio verify failed', { requestId, twilioData: JSON.stringify(twilioData) });
      return errorResponse(400, 'Invalid or expired verification code', { requestId });
    }

    edgeLog('info', `OTP verified for ${phone}`, { requestId });

    // Returning user: create session via magic link
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .or(`phone.eq.${phone},phone.eq.${phoneDigits},phone.eq.+${phoneDigits}`)
      .limit(1)
      .maybeSingle();

    if (profile?.user_id) {
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
      if (!getUserError && userData?.user?.email) {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.user.email,
        });
        if (!linkError && linkData?.properties?.hashed_token) {
          const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'magiclink',
          });
          if (!verifyError && verifyData?.session) {
            edgeLog('info', `OTP login successful for ${phone}`, { requestId });
            return successResponse({
              verified: true,
              access_token: verifyData.session.access_token,
              refresh_token: verifyData.session.refresh_token,
            }, requestId);
          }
        }
      }
    }

    // New user: just return verified
    return successResponse({ verified: true }, requestId);
  } catch (err) {
    edgeLog('error', 'verify-otp error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
