import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const schema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
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

    const allowed = await checkRateLimit('email-verify-confirm', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid code format', { requestId });
    }

    const { code } = parsed.data;
    const meta = user.user_metadata || {};

    if (!meta.email_otp_target) {
      return errorResponse(400, 'No pending verification. Please request a new code.', { requestId });
    }

    const targetEmail = meta.email_otp_target;

    // Verify OTP via Twilio Verify
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!accountSid || !authToken || !serviceSid) {
      return errorResponse(500, 'Email service not configured', { requestId });
    }

    const twilioUrl = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: targetEmail,
        Code: code,
      }),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok || twilioData.status !== 'approved') {
      edgeLog('error', 'Twilio verify check error', { requestId, twilioData });
      const msg = twilioData.status === 'pending' ? 'Invalid code. Please try again.' : (twilioData.message || 'Verification failed');
      return errorResponse(400, msg, { requestId });
    }

    // Verification successful — update profile
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Clear the target email from metadata
    await serviceClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...meta,
        email_otp_target: null,
      },
    });

    // Update profile with verified email
    await serviceClient
      .from('profiles')
      .update({ email: targetEmail, email_verified: true })
      .eq('user_id', user.id);

    return successResponse({ success: true, email: targetEmail }, requestId);
  } catch (err) {
    edgeLog('error', 'email-verify-confirm error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
