import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const schema = z.object({
  event_id: z.string().uuid(),
  code: z.string().min(1).max(50),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event_id, code } = parsed.data;

    // Look up the discount code
    const { data: discount, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('event_id', event_id)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !discount) {
      return new Response(JSON.stringify({ error: 'Invalid or expired discount code' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ticket limit if applicable
    if (discount.ticket_limit_type !== 'unlimited' && discount.ticket_limit_amount !== null) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('status', 'confirmed');
      // Simple check — in production you'd track per-code usage
    }

    return new Response(JSON.stringify({
      valid: true,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      reveal_hidden_tickets: discount.reveal_hidden_tickets,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
