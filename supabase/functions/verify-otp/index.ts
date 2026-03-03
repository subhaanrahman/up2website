import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function errorResponse(msg: string, status: number, details?: string) {
  return new Response(
    JSON.stringify({ error: msg, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/**
 * Verify OTP only — no account creation.
 * Returns { verified: true } on success.
 * Account creation happens in the /register edge function.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit('verify-otp', null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone, code } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse('Invalid phone number', 400);
    }
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return errorResponse('Invalid verification code', 400);
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!accountSid || !authToken || !serviceSid) {
      return errorResponse('SMS service not configured', 500);
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
      console.error('Twilio verify failed:', JSON.stringify(twilioData));
      return errorResponse('Invalid or expired verification code', 400);
    }

    console.log(`OTP verified for ${phone}`);

    return new Response(
      JSON.stringify({ verified: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('verify-otp error:', err);
    return errorResponse('Internal server error', 500, String(err));
  }
});
