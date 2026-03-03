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

    const internalEmail = phoneToInternalEmail(phone);
    const phoneDigits = phone.replace(/[^0-9]/g, '');

    // Find user by phone
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const user = users?.users?.find(
      (u) => u.email === internalEmail ||
             u.phone === phone ||
             u.phone === phoneDigits ||
             u.phone === `+${phoneDigits}`,
    );

    if (!user) {
      return errorResponse('Invalid phone number or password', 401);
    }

    // Verify password via GoTrue token endpoint directly
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({
        email: user.email || internalEmail,
        password,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Login failed:', JSON.stringify(tokenData));
      return errorResponse('Invalid phone number or password', 401);
    }

    console.log(`Login successful for ${phone}`);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        user_id: tokenData.user?.id || user.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('login error:', err);
    return errorResponse('Internal server error', 500, String(err));
  }
});
