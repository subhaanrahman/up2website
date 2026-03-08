import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyPassword } from "../_shared/password.ts";

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

// Create clients ONCE at module level (reused across warm invocations)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const supabaseAnon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, password } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse('Invalid phone number', 400);
    }
    if (!password || typeof password !== 'string') {
      return errorResponse('Password is required', 400);
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
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const profile = profileResult.data;
    if (!profile) {
      return errorResponse('Invalid phone number or password', 401);
    }

    // Get auth user to check migration status
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (getUserError || !userData?.user) {
      return errorResponse('Invalid phone number or password', 401);
    }

    const user = userData.user;
    const isMigrated = user.user_metadata?.password_migrated === true;

    if (!isMigrated) {
      // Legacy user: verify custom hash, then migrate
      const storedHash = user.user_metadata?.password_hash;
      if (!storedHash) {
        return errorResponse('Invalid phone number or password', 401);
      }

      const passwordValid = await verifyPassword(password, storedHash);
      if (!passwordValid) {
        return errorResponse('Invalid phone number or password', 401);
      }

      // Migrate password to native Supabase auth (fire-and-forget, non-blocking)
      supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        user_metadata: { ...user.user_metadata, password_migrated: true },
      }).then(({ error: updateErr }) => {
        if (updateErr) console.error('Password migration failed:', updateErr.message);
      });
    }

    // Sign in via native Supabase auth (handles password verification for migrated users)
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      phone: user.phone || phoneDigits,
      password,
    });

    if (signInError || !signInData?.session) {
      // If sign-in fails for a non-migrated user, the migration might not have completed yet
      if (!isMigrated) {
        // Wait briefly for migration to complete, then retry
        await new Promise(r => setTimeout(r, 300));
        const { data: retryData, error: retryError } = await supabaseAnon.auth.signInWithPassword({
          phone: user.phone || phoneDigits,
          password,
        });
        if (retryError || !retryData?.session) {
          console.error('signInWithPassword retry error:', JSON.stringify(retryError));
          return errorResponse('Login failed', 500);
        }
        return new Response(
          JSON.stringify({
            success: true,
            access_token: retryData.session.access_token,
            refresh_token: retryData.session.refresh_token,
            user_id: user.id,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      console.error('signInWithPassword error:', JSON.stringify(signInError));
      return errorResponse('Login failed', 500);
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        user_id: user.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('login error:', err);
    return errorResponse('Internal server error', 500, String(err));
  }
});
