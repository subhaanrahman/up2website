import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

/**
 * Verify OTP only — no account creation.
 * Returns { verified: true } on success.
 * Account creation happens in the /register edge function.
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

    return successResponse({ verified: true }, requestId);
  } catch (err) {
    edgeLog('error', 'verify-otp error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
