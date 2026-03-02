import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function errorResponse(msg: string, status: number) {
  return new Response(
    JSON.stringify({ error: msg }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/**
 * Derives a deterministic internal email from a phone number.
 * This is used solely to create a Supabase session via magic link token.
 */
function phoneToInternalEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@phone.local`;
}

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

    // ── Step 1: Verify OTP with Twilio Verify ──
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
      console.error('Twilio verify failed:', twilioData);
      return errorResponse('Invalid or expired verification code', 400);
    }

    // ── Step 2: Find or create user in Supabase ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const internalEmail = phoneToInternalEmail(phone);

    // Try to find existing user by phone or internal email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(
      (u) => u.phone === phone || u.email === internalEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Ensure phone and email are confirmed
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        phone,
        phone_confirm: true,
        email: internalEmail,
        email_confirm: true,
      });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        phone_confirm: true,
        email: internalEmail,
        email_confirm: true,
        user_metadata: { display_name: phone },
      });

      if (createError) {
        console.error('Create user error:', createError);
        return errorResponse('Failed to create account', 500);
      }
      userId = newUser.user.id;
    }

    // ── Step 3: Generate a session by signing in as the user ──
    // Use generateLink to get the OTP, then verify it server-side immediately
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: internalEmail,
    });

    if (linkError || !linkData) {
      console.error('Generate link error:', linkError);
      return errorResponse('Failed to create session', 500);
    }

    // Extract the hashed token and verify it server-side to get a session
    const hashedToken = linkData.properties?.hashed_token;
    if (!hashedToken) {
      console.error('No hashed_token in link data');
      return errorResponse('Failed to create session token', 500);
    }

    // Create an anon client to verify the OTP and get session tokens
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: sessionData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
      email: internalEmail,
      token: hashedToken,
      type: 'email',
    });

    if (verifyError || !sessionData.session) {
      console.error('Server-side verify error:', verifyError);
      return errorResponse('Failed to create session', 500);
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('verify-otp error:', err);
    return errorResponse('Internal server error', 500);
  }
});
