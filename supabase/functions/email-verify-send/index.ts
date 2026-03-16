import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const schema = z.object({
  email: z.string().email().max(255),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Missing authorization', { requestId });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Unauthorized', { requestId });
    }

    const allowed = await checkRateLimit('email-verify-send', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid email', { requestId });
    }

    const { email } = parsed.data;

    // Store the target email in user metadata so we can verify it later
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: updateErr } = await serviceClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        email_otp_target: email,
      },
    });

    if (updateErr) {
      return errorResponse(500, 'Failed to initiate verification', { requestId });
    }

    // Send OTP via Twilio Verify email channel
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!accountSid || !authToken || !serviceSid) {
      edgeLog('error', 'Missing Twilio credentials', { requestId });
      return errorResponse(500, 'Email service not configured', { requestId });
    }

    const twilioUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: email,
        Channel: 'email',
      }),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      edgeLog('error', 'Twilio email verify error', { requestId, twilioData });
      return errorResponse(400, twilioData.message || 'Failed to send verification email', { requestId });
    }

    return successResponse({ success: true, message: 'Verification code sent to your email' }, requestId);
  } catch (err) {
    edgeLog('error', 'email-verify-send error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
