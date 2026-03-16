import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { hashPassword } from "../_shared/password.ts";
import { generateAndUploadInitialsAvatar } from "../_shared/avatar.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

function phoneToInternalEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@phone.local`;
}

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit('register', null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone, password, firstName, lastName, username } = await req.json();

    // ── Validation ──
    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse(400, 'Invalid phone number', { requestId });
    }
    if (!password || typeof password !== 'string') {
      return errorResponse(400, 'Password is required', { requestId });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return errorResponse(400, 'Password must be 8+ characters with at least 1 letter, 1 number, and 1 special character', { requestId });
    }
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1) {
      return errorResponse(400, 'First name is required', { requestId });
    }
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1) {
      return errorResponse(400, 'Last name is required', { requestId });
    }
    if (!username || typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
      return errorResponse(400, 'Username must be 3-30 characters (letters, numbers, underscores only)', { requestId });
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
      return errorResponse(409, 'Username is already taken', { requestId });
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
      return errorResponse(409, 'An account with this phone number already exists. Please log in instead.', { requestId });
    }

    // ── Create user with real password for signInWithPassword ──
    const internalEmail = phoneToInternalEmail(phone);
    const passwordHash = await hashPassword(password);

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email: internalEmail,
      email_confirm: true,
      password, // Sets actual Supabase auth password for signInWithPassword
      user_metadata: {
        display_name: `${firstName.trim()} ${lastName.trim()}`,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.toLowerCase(),
        password_hash: passwordHash, // Keep for backward compat
      },
    });

    if (createError) {
      edgeLog('error', 'Create user error', { requestId, error: JSON.stringify(createError) });
      return errorResponse(500, 'Failed to create account', { requestId, details: createError.message });
    }

    if (!newUser?.user) {
      return errorResponse(500, 'Failed to create account: no user returned', { requestId });
    }

    const userId = newUser.user.id;
    edgeLog('info', `Created user ${userId} for phone ${phone}`, { requestId });

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
      edgeLog('error', 'Profile update error', { requestId, error: JSON.stringify(profileError) });
      await supabaseAdmin.from('profiles').insert({ user_id: userId, ...profileData });
    }

    // ── Generate initials avatar (non-blocking) ──
    try {
      const avatarUrl = await generateAndUploadInitialsAvatar(
        supabaseAdmin,
        userId,
        `${firstName.trim()} ${lastName.trim()}`,
      );
      await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);
      edgeLog('info', `Generated initials avatar for user ${userId}`, { requestId });
    } catch (avatarErr) {
      edgeLog('error', 'Initials avatar generation failed (non-fatal)', { requestId, error: String(avatarErr) });
    }

    // ── Create session via signInWithPassword using phone (single fast call) ──
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      phone: phone.replace(/[^0-9]/g, ''),
      password,
    });

    if (signInError || !signInData?.session) {
      edgeLog('error', 'signInWithPassword error', { requestId, error: JSON.stringify(signInError) });
      return errorResponse(500, 'Account created but sign-in failed. Please log in manually.', { requestId });
    }

    edgeLog('info', `Registration complete for user ${userId}`, { requestId });

    return successResponse({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user_id: userId,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'register error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
