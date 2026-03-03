import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
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
 * Derives a deterministic internal email from a phone number.
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
      console.error('Twilio verify failed:', JSON.stringify(twilioData));
      return errorResponse('Invalid or expired verification code', 400);
    }

    // ── Step 2: Find or create user in Supabase ──
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const internalEmail = phoneToInternalEmail(phone);

    // Use paginated search to find user by email (more reliable than listUsers)
    let existingUser = null;

    // Search by internal email first (most reliable identifier)
    const { data: emailUsers, error: emailSearchErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (emailSearchErr) {
      console.error('User search error:', JSON.stringify(emailSearchErr));
      return errorResponse('Failed to search for existing account', 500, emailSearchErr.message);
    }

    existingUser = emailUsers?.users?.find(
      (u) => u.email === internalEmail || u.phone === phone
    ) ?? null;

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`Found existing user ${userId} for phone ${phone}`);
      
      // Ensure phone and email are confirmed
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        phone,
        phone_confirm: true,
        email: internalEmail,
        email_confirm: true,
      });

      if (updateErr) {
        console.error('Update user error:', JSON.stringify(updateErr));
        // Non-fatal: continue anyway since user exists
      }
    } else {
      isNewUser = true;
      console.log(`Creating new user for phone ${phone}, email ${internalEmail}`);

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone,
        phone_confirm: true,
        email: internalEmail,
        email_confirm: true,
        user_metadata: { display_name: phone },
      });

      if (createError) {
        console.error('Create user error:', JSON.stringify(createError));
        
        // Check if it's a duplicate error
        const errMsg = createError.message?.toLowerCase() || '';
        if (errMsg.includes('already') || errMsg.includes('duplicate') || errMsg.includes('unique')) {
          return errorResponse(
            'An account with this phone number already exists but could not be found. Please try again.',
            409,
            createError.message,
          );
        }
        
        return errorResponse(
          'Failed to create account',
          500,
          createError.message,
        );
      }

      if (!newUser?.user) {
        console.error('Create user returned no user object');
        return errorResponse('Failed to create account: no user returned', 500);
      }

      userId = newUser.user.id;
      console.log(`Created new user ${userId}`);
    }

    // ── Step 3: Create a session using password-based sign-in ──
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (pwError) {
      console.error('Set password error:', JSON.stringify(pwError));
      return errorResponse(
        'Failed to create session: could not set credentials',
        500,
        pwError.message,
      );
    }

    // Sign in with the temporary password to get session tokens
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: internalEmail,
      password: tempPassword,
    });

    if (signInError) {
      console.error('Sign in error:', JSON.stringify(signInError));
      return errorResponse(
        'Failed to create session: sign-in failed',
        500,
        signInError.message,
      );
    }

    if (!signInData?.session) {
      console.error('Sign in returned no session');
      return errorResponse('Failed to create session: no session returned', 500);
    }

    console.log(`Session created successfully for user ${userId} (new: ${isNewUser})`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: userId,
        is_new_user: isNewUser,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('verify-otp error:', err);
    return errorResponse('Internal server error', 500, String(err));
  }
});
