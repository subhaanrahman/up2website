import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { generateAndUploadInitialsAvatar } from "../_shared/avatar.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import "../_shared/job-handlers.ts";
import { enqueueAuthMomSignup } from "../_shared/mom-auth-events.ts";

function phoneToInternalEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@phone.local`;
}

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

    const { phone, displayName, username } = await req.json();

    // ── Validation ──
    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse(400, 'Invalid phone number', { requestId });
    }
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 1) {
      return errorResponse(400, 'Display name is required', { requestId });
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

    // ── Create user for OTP-only onboarding ──
    const internalEmail = phoneToInternalEmail(phone);
    const normalizedDisplayName = displayName.trim();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email: internalEmail,
      email_confirm: true,
      user_metadata: {
        display_name: normalizedDisplayName,
        username: username.toLowerCase(),
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
      display_name: normalizedDisplayName,
      username: username.toLowerCase(),
      first_name: normalizedDisplayName,
      last_name: null,
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
        normalizedDisplayName,
      );
      await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);
      edgeLog('info', `Generated initials avatar for user ${userId}`, { requestId });
    } catch (avatarErr) {
      edgeLog('error', 'Initials avatar generation failed (non-fatal)', { requestId, error: String(avatarErr) });
    }

    // ── Create session via server-generated magic link ──
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: internalEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      edgeLog('error', 'generateLink error', { requestId, error: JSON.stringify(linkError) });
      return errorResponse(500, 'Account created but sign-in failed. Please log in manually.', { requestId });
    }

    let { data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    });
    if (verifyError) {
      ({ data: verifyData, error: verifyError } = await supabaseAnon.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: 'magiclink',
      }));
    }

    if (verifyError || !verifyData?.session) {
      edgeLog('error', 'verifyOtp error', { requestId, error: JSON.stringify(verifyError) });
      return errorResponse(500, 'Account created but sign-in failed. Please log in manually.', { requestId });
    }

    edgeLog('info', `Registration complete for user ${userId}`, { requestId });

    await enqueueAuthMomSignup(userId, requestId);

    return successResponse({
      success: true,
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      user_id: userId,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'register error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
