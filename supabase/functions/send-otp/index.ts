import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { toE164 } from "../_shared/phone.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    // Rate limit by IP (no auth yet)
    const ip = getClientIp(req);
    const allowed = await checkRateLimit('send-otp', null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse(400, 'Invalid phone number', { requestId });
    }

    const phoneE164 = toE164(phone);

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!accountSid || !authToken || !serviceSid) {
      edgeLog('error', 'Missing Twilio credentials', { requestId });
      return errorResponse(500, 'SMS service not configured', { requestId });
    }

    // Call Twilio Verify API to send OTP
    const twilioUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneE164,
        Channel: 'sms',
      }),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      edgeLog('error', 'Twilio error', { requestId, twilioData });
      return errorResponse(400, twilioData.message || 'Failed to send OTP', { requestId });
    }

    return successResponse({ success: true, status: twilioData.status }, requestId);
  } catch (err) {
    edgeLog('error', 'send-otp error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
