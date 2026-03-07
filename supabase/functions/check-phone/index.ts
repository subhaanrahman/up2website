import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.startsWith('0') ? digits : `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const allowed = await checkRateLimit('check-phone', null, ip);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fast indexed lookup on profiles.phone — single column check
    const digits = phone.replace(/[^0-9]/g, '');

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(`phone.eq.${digits},phone.eq.+${digits}`)
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({ exists: !!data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('check-phone error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
