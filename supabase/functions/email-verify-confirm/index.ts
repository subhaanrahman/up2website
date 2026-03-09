import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const schema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowed = await checkRateLimit('email-verify-confirm', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid code format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code } = parsed.data;
    const meta = user.user_metadata || {};

    if (!meta.email_otp_target) {
      return new Response(JSON.stringify({ error: 'No pending verification. Please request a new code.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetEmail = meta.email_otp_target;

    // Verify OTP via Twilio Verify
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const serviceSid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!accountSid || !authToken || !serviceSid) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      console.error('Twilio verify check error:', twilioData);
      const msg = twilioData.status === 'pending' ? 'Invalid code. Please try again.' : (twilioData.message || 'Verification failed');
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ success: true, email: targetEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('email-verify-confirm error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
