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

    // Rate limit + profile lookup in PARALLEL
    const phoneDigits = phone.replace(/[^0-9]/g, '');
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
        .select('user_id')
        .or(`phone.eq.${phone},phone.eq.${phoneDigits},phone.eq.+${phoneDigits}`)
        .limit(1)
        .maybeSingle(),
    ]);

    // Check rate limit (fail open on error)
    if (rateLimitResult.data === false) {
      return errorResponse(429, 'Too many requests. Please try again later.', { requestId });
    }

    const profile = profileResult.data;
    if (!profile) {
      return errorResponse(401, 'Invalid phone number or password', { requestId });
    }

    // Get auth user to check migration status
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (getUserError || !userData?.user) {
      return errorResponse(401, 'Invalid phone number or password', { requestId });
    }

    const user = userData.user;
    const isMigrated = user.user_metadata?.password_migrated === true;

    if (!isMigrated) {
      // Legacy user: verify custom hash, then migrate
      const storedHash = user.user_metadata?.password_hash;
      if (!storedHash) {
        return errorResponse(401, 'Invalid phone number or password', { requestId });
      }

      const passwordValid = await verifyPassword(password, storedHash);
      if (!passwordValid) {
        return errorResponse(401, 'Invalid phone number or password', { requestId });
      }

      // Migrate password to native Supabase auth — MUST complete before signIn
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        user_metadata: { ...user.user_metadata, password_migrated: true },
      });
      if (updateErr) {
        edgeLog('error', 'Password migration failed', { requestId, error: updateErr.message });
        return errorResponse(500, 'Login failed', { requestId });
      }
    }

    // Sign in via native Supabase auth
    const signInPhone = (user.phone || phone).replace(/[^0-9]/g, '');
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      phone: signInPhone,
      password,
    });

    if (signInError || !signInData?.session) {
      edgeLog('error', 'signInWithPassword error', { requestId, error: JSON.stringify(signInError) });
      return errorResponse(401, 'Invalid phone number or password', { requestId });
    }

    return successResponse({
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user_id: user.id,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'login error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
