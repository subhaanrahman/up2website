import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { hashPassword } from "../_shared/password.ts";

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

function phoneToInternalEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@phone.local`;
}

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit('register', null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone, password, firstName, lastName, username } = await req.json();

    // ── Validation ──
    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse('Invalid phone number', 400);
    }
    if (!password || typeof password !== 'string') {
      return errorResponse('Password is required', 400);
    }
    if (!PASSWORD_REGEX.test(password)) {
      return errorResponse(
        'Password must be 8+ characters with at least 1 letter, 1 number, and 1 special character',
        400,
      );
    }
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1) {
      return errorResponse('First name is required', 400);
    }
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1) {
      return errorResponse('Last name is required', 400);
    }
    if (!username || typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
      return errorResponse('Username must be 3-30 characters (letters, numbers, underscores only)', 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Check username uniqueness ──
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return errorResponse('Username is already taken', 409);
    }

    // ── Check if phone already registered (fast indexed lookup) ──
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    const { data: existingPhoneProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`phone.eq.${phone},phone.eq.${phoneDigits},phone.eq.+${phoneDigits}`)
      .limit(1)
      .maybeSingle();

    if (existingPhoneProfile) {
      return errorResponse('An account with this phone number already exists. Please log in instead.', 409);
    }

    // ── Create user ──
    const internalEmail = phoneToInternalEmail(phone);
    const passwordHash = await hashPassword(password);

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email: internalEmail,
      email_confirm: true,
      password,
      user_metadata: {
        display_name: `${firstName.trim()} ${lastName.trim()}`,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.toLowerCase(),
        password_hash: passwordHash,
      },
    });

    if (createError) {
      console.error('Create user error:', JSON.stringify(createError));
      return errorResponse('Failed to create account', 500, createError.message);
    }

    if (!newUser?.user) {
      return errorResponse('Failed to create account: no user returned', 500);
    }

    const userId = newUser.user.id;
    console.log(`Created user ${userId} for phone ${phone}`);

    // ── Update profile with registration data + phone ──
    const profileData = {
      display_name: `${firstName.trim()} ${lastName.trim()}`,
      username: username.toLowerCase(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone,
    };

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId);

    if (profileError) {
      console.error('Profile update error:', JSON.stringify(profileError));
      await supabaseAdmin.from('profiles').insert({ user_id: userId, ...profileData });
    }

    // ── Create session via magic link ──
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: internalEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Generate link error:', JSON.stringify(linkError));
      return errorResponse('Account created but session generation failed.', 500);
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError || !verifyData?.session) {
      console.error('Verify OTP error:', JSON.stringify(verifyError));
      return errorResponse('Account created but sign-in failed. Please log in manually.', 500);
    }

    console.log(`Registration complete for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('register error:', err);
    return errorResponse('Internal server error', 500, String(err));
  }
});
