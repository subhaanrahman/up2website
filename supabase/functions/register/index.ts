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

function phoneToInternalEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@phone.local`;
}

// Password policy: 8+ chars, at least 1 letter, 1 number, 1 special character
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

    // ── Check if phone already registered ──
    const internalEmail = phoneToInternalEmail(phone);
    const phoneDigits = phone.replace(/[^0-9]/g, '');

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const existingUser = existingUsers?.users?.find(
      (u) => u.email === internalEmail || 
             u.phone === phone || 
             u.phone === phoneDigits ||
             u.phone === `+${phoneDigits}`,
    );

    if (existingUser) {
      return errorResponse('An account with this phone number already exists. Please log in instead.', 409);
    }

    // ── Create user ──
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

    // ── Update profile with registration data ──
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: `${firstName.trim()} ${lastName.trim()}`,
        username: username.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Profile update error:', JSON.stringify(profileError));
      // Non-fatal — user is created, profile trigger may not have fired yet
      // Try insert instead
      await supabaseAdmin.from('profiles').insert({
        user_id: userId,
        display_name: `${firstName.trim()} ${lastName.trim()}`,
        username: username.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
    }

    // ── Create session ──
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (signInError || !signInData?.session) {
      console.error('Sign in error:', JSON.stringify(signInError));
      return errorResponse('Account created but sign-in failed. Please log in manually.', 500);
    }

    console.log(`Registration complete for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('register error:', err);
    return errorResponse('Internal server error', 500, String(err));
  }
});
