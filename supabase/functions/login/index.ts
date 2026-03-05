import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
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

function phoneToInternalEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@phone.local`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit('login', null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone, password } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return errorResponse('Invalid phone number', 400);
    }
    if (!password || typeof password !== 'string') {
      return errorResponse('Password is required', 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fast lookup: find user_id via profiles.phone
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .or(`phone.eq.${phone},phone.eq.${phoneDigits},phone.eq.+${phoneDigits}`)
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return errorResponse('Invalid phone number or password', 401);
    }

    // Get the auth user to verify password
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (getUserError || !userData?.user) {
      return errorResponse('Invalid phone number or password', 401);
    }

    const user = userData.user;
    const storedHash = user.user_metadata?.password_hash;
    if (!storedHash) {
      console.error('No password hash found for user', user.id);
      return errorResponse('Invalid phone number or password', 401);
    }

    const passwordValid = await verifyPassword(password, storedHash);
    if (!passwordValid) {
      return errorResponse('Invalid phone number or password', 401);
    }

    // Generate session via magic link
    const internalEmail = phoneToInternalEmail(phone);
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email || internalEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Generate link error:', JSON.stringify(linkError));
      return errorResponse('Login failed', 500);
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
      return errorResponse('Login failed', 500);
    }

    console.log(`Login successful for ${phone}`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        user_id: user.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('login error:', err);
    return errorResponse('Internal server error', 500, String(err));
  }
});
