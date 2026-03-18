import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyPassword } from "../_shared/password.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

// Create clients ONCE at module level (reused across warm invocations)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const supabaseAnon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const { phone, password } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse(400, 'Invalid phone number', { requestId });
    }
    if (!password || typeof password !== 'string') {
      return errorResponse(400, 'Password is required', { requestId });
    }

    edgeLog('info', 'Login attempt', { requestId });

    // Rate limit + profile lookup in PARALLEL (use same phone formats as check-phone)
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    const phoneE164 = phoneDigits ? `+${phoneDigits}` : phone;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip') ?? null;

    const [rateLimitResult, profileResult] = await Promise.all([
      supabaseAdmin.rpc('check_rate_limit', {
        p_endpoint: 'login',
        p_user_id: null,
        p_ip_address: ip,
        p_max_requests: 10,
        p_window_seconds: 60,
      }),
      supabaseAdmin
        .from('profiles')
        .select('user_id, phone')
        .or(`phone.eq.${phoneDigits},phone.eq.+${phoneDigits}`)
        .limit(1)
        .maybeSingle(),
    ]);

    // Check rate limit (fail open on error)
    if (rateLimitResult.data === false) {
      return errorResponse(429, 'Too many requests. Please try again later.', { requestId });
    }

    const profile = profileResult.data;
    edgeLog('info', 'Profile lookup result', {
      requestId,
      found: !!profile,
      profileError: profileResult.error?.message ?? null,
    });
    if (!profile) {
      edgeLog('warn', 'Profile not found for phone', {
        requestId,
        phone,
        phoneDigits,
        phoneE164,
        profileError: profileResult.error?.message,
      });
      return errorResponse(401, 'Invalid phone number or password', {
        requestId,
        code: 'PROFILE_NOT_FOUND',
        details: { hint: 'No profile found for this phone. Check profiles.phone format matches what check-phone uses.' },
      });
    }

    // Get auth user to check migration status
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    const isSeededPath = !!getUserError || !userData?.user;
    edgeLog('info', 'getUserById result', { requestId, isSeededPath, getUserError: getUserError?.message ?? null });

    // Fallback: seeded users can hit "Database error loading user" from Admin API; try signInWithPassword with multiple formats
    if (isSeededPath) {
      const profilePhone = profile.phone ? String(profile.phone).replace(/\s/g, '') : null;
      const profileDigits = profilePhone ? profilePhone.replace(/\D/g, '') : '';
      const profileE164 = profileDigits ? `+${profileDigits}` : profilePhone;
      const formats = [...new Set([phoneDigits, phoneE164, phone, profilePhone, profileDigits, profileE164].filter((f): f is string => !!f && f.length >= 8))];
      for (const fmt of formats) {
        const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
          phone: fmt,
          password,
        });
        if (!signInErr && signInData?.session) {
          edgeLog('info', `Login successful via signInWithPassword fallback for ${phone}`, { requestId });
          return successResponse({
            success: true,
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            user_id: signInData.session.user?.id ?? profile.user_id,
          }, requestId);
        }
      }
      edgeLog('info', 'signInWithPassword failed, trying verify RPC', { requestId });
      // signInWithPassword failed — try custom verify (handles pgcrypto-written hashes from forgot-password RPC)
      const { data: verifyResult, error: verifyRpcError } = await supabaseAdmin.rpc('verify_auth_password', {
        p_user_id: profile.user_id,
        p_password: password,
      });
      edgeLog('info', 'verify_auth_password result', { requestId, valid: verifyResult?.valid, hasError: !!verifyRpcError });
      if (verifyRpcError) {
        edgeLog('warn', 'verify_auth_password RPC failed', { requestId, error: verifyRpcError.message });
        return errorResponse(401, 'Invalid phone number or password', {
          requestId,
          code: 'LOGIN_VERIFY_RPC_FAILED',
          details: { hint: 'RPC failed. Run migration 20260318150000_verify_auth_password.sql and NOTIFY pgrst, reload schema.' },
        });
      }
      if (verifyResult?.valid !== true) {
        edgeLog('debug', 'verify_auth_password returned valid: false', { requestId });
        return errorResponse(401, 'Invalid phone number or password', {
          requestId,
          code: 'LOGIN_VERIFY_INVALID',
          details: { hint: 'Password did not match stored hash. Reset password again after deploying forgot-password-reset.' },
        });
      }
      // Password verified — sync to auth.users (phone-only; no generateLink/email)
      const { error: syncErr } = await supabaseAdmin.auth.admin.updateUserById(profile.user_id, {
        password,
      });
      if (syncErr) {
        edgeLog('warn', 'Password sync failed (Admin API), trying RPC', { requestId, error: syncErr.message });
        const { error: rpcErr } = await supabaseAdmin.rpc('update_auth_user_password', {
          p_user_id: profile.user_id,
          p_new_password: password,
        });
        if (rpcErr) {
          edgeLog('warn', 'Password sync RPC also failed', { requestId, error: rpcErr.message });
          return errorResponse(401, 'Invalid phone number or password', {
            requestId,
            code: 'LOGIN_SYNC_FAILED',
            details: { hint: 'Password verified but could not sync. Run update_auth_user_password migration and NOTIFY pgrst, reload schema.' },
          });
        }
      }
      // Sync succeeded (Admin or RPC) — retry signInWithPassword with auth.users.phone first, then synthetic email
      const authPhone = verifyResult?.phone ? String(verifyResult.phone).replace(/\s/g, '') : null;
      const authDigits = authPhone ? authPhone.replace(/\D/g, '') : phoneDigits;
      const authE164 = authDigits ? `+${authDigits}` : authPhone;
      const retryFormats = [...new Set([authPhone, authE164, authDigits, ...formats].filter((f): f is string => !!f && f.length >= 8))];
      for (const fmt of retryFormats) {
        const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
          phone: fmt,
          password,
        });
        if (!signInErr && signInData?.session) {
          edgeLog('info', `Login successful via verify+sync+signIn (phone) for ${phone}`, { requestId });
          return successResponse({
            success: true,
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            user_id: signInData.session.user?.id ?? profile.user_id,
          }, requestId);
        }
        if (signInErr) edgeLog('debug', 'signInWithPassword phone attempt', { requestId, fmt, error: signInErr.message });
      }
      // Fallback: try signInWithPassword with synthetic email (GoTrue may lookup by email for password auth)
      const syntheticEmail = verifyResult?.email || (authDigits ? `${authDigits}@phone.local` : null);
      if (syntheticEmail) {
        const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
          email: syntheticEmail,
          password,
        });
        if (!signInErr && signInData?.session) {
          edgeLog('info', `Login successful via verify+sync+signIn (email) for ${phone}`, { requestId });
          return successResponse({
            success: true,
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            user_id: signInData.session.user?.id ?? profile.user_id,
          }, requestId);
        }
        if (signInErr) edgeLog('debug', 'signInWithPassword email attempt', { requestId, email: syntheticEmail, error: signInErr.message });
      }
      edgeLog('info', 'Returning LOGIN_SESSION_FAILED (seeded path)', { requestId });
      return errorResponse(401, 'Invalid phone number or password', {
        requestId,
        code: 'LOGIN_SESSION_FAILED',
        details: { hint: 'Password verified and synced but signIn still failed. Check auth.users phone/email and Supabase Auth config.' },
      });
    }

    const user = userData.user;
    const isMigrated = user.user_metadata?.password_migrated === true;
    const storedHash = user.user_metadata?.password_hash;

    // Legacy user: has password_hash in metadata, needs migration to auth.users
    if (!isMigrated && storedHash) {
      const passwordValid = await verifyPassword(password, storedHash);
      if (!passwordValid) {
        return errorResponse(401, 'Invalid phone number or password', { requestId });
      }
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        user_metadata: { ...user.user_metadata, password_migrated: true },
      });
      if (updateErr) {
        edgeLog('error', 'Password migration failed', { requestId, error: updateErr.message });
        return errorResponse(500, 'Login failed', { requestId });
      }
    }

    // Sign in via native Supabase auth — try multiple phone formats (auth.users.phone vs request format)
    const signInPhones = [
      (user.phone || '').replace(/[^0-9]/g, ''),
      user.phone,
      phoneDigits,
      phoneE164,
      phone,
    ].filter((f): f is string => !!f && f.length >= 8);
    for (const fmt of [...new Set(signInPhones)]) {
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        phone: fmt,
        password,
      });
      if (!signInError && signInData?.session) {
        return successResponse({
          success: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user_id: user.id,
        }, requestId);
      }
    }
    // signInWithPassword failed — try custom verify (handles pgcrypto-written hashes from forgot-password RPC)
    const { data: verifyResult, error: verifyRpcError } = await supabaseAdmin.rpc('verify_auth_password', {
      p_user_id: user.id,
      p_password: password,
    });
    if (verifyRpcError) {
      edgeLog('warn', 'verify_auth_password RPC failed', { requestId, error: verifyRpcError.message });
      return errorResponse(401, 'Invalid phone number or password', {
        requestId,
        code: 'LOGIN_VERIFY_RPC_FAILED',
        details: { hint: 'RPC failed. Run migration 20260318150000_verify_auth_password.sql and NOTIFY pgrst, reload schema.' },
      });
    }
    if (verifyResult?.valid !== true) {
      edgeLog('debug', 'verify_auth_password returned valid: false', { requestId });
      return errorResponse(401, 'Invalid phone number or password', {
        requestId,
        code: 'LOGIN_VERIFY_INVALID',
        details: { hint: 'Password did not match stored hash. Reset password again after deploying forgot-password-reset.' },
      });
    }
    // Password verified — sync to auth.users (phone-only; no generateLink/email)
    const { error: syncErr2 } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
    });
    if (syncErr2) {
      edgeLog('warn', 'Password sync failed (Admin API), trying RPC', { requestId, error: syncErr2.message });
      const { error: rpcErr } = await supabaseAdmin.rpc('update_auth_user_password', {
        p_user_id: user.id,
        p_new_password: password,
      });
      if (rpcErr) {
        edgeLog('warn', 'Password sync RPC also failed', { requestId, error: rpcErr.message });
        return errorResponse(401, 'Invalid phone number or password', {
          requestId,
          code: 'LOGIN_SYNC_FAILED',
          details: { hint: 'Password verified but could not sync. Run update_auth_user_password migration and NOTIFY pgrst, reload schema.' },
        });
      }
    }
    // Sync succeeded (Admin or RPC) — retry signInWithPassword with auth.users.phone first, then synthetic email
    const authPhone2 = verifyResult?.phone ? String(verifyResult.phone).replace(/\s/g, '') : null;
    const authDigits2 = authPhone2 ? authPhone2.replace(/\D/g, '') : phoneDigits;
    const authE1642 = authDigits2 ? `+${authDigits2}` : authPhone2;
    const retryPhones = [...new Set([authPhone2, authE1642, authDigits2, ...signInPhones].filter((f): f is string => !!f && f.length >= 8))];
    for (const fmt of retryPhones) {
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        phone: fmt,
        password,
      });
      if (!signInError && signInData?.session) {
        edgeLog('info', `Login successful via verify+sync+signIn (phone) for ${phone}`, { requestId });
        return successResponse({
          success: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user_id: user.id,
        }, requestId);
      }
      if (signInError) edgeLog('debug', 'signInWithPassword phone attempt', { requestId, fmt, error: signInError.message });
    }
    const syntheticEmail2 = verifyResult?.email || (authDigits2 ? `${authDigits2}@phone.local` : null);
    if (syntheticEmail2) {
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: syntheticEmail2,
        password,
      });
      if (!signInError && signInData?.session) {
        edgeLog('info', `Login successful via verify+sync+signIn (email) for ${phone}`, { requestId });
        return successResponse({
          success: true,
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user_id: user.id,
        }, requestId);
      }
      if (signInError) edgeLog('debug', 'signInWithPassword email attempt', { requestId, email: syntheticEmail2, error: signInError.message });
    }
    edgeLog('error', 'signInWithPassword all attempts failed', { requestId });
    return errorResponse(401, 'Invalid phone number or password', {
      requestId,
      code: 'LOGIN_SESSION_FAILED',
      details: { hint: 'Password verified and synced but signIn still failed. Check auth.users.phone format.' },
    });
  } catch (err) {
    edgeLog('error', 'login error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
