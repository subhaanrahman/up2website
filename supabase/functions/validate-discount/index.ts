import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const schema = z.object({
  event_id: z.string().uuid(),
  code: z.string().min(1).max(50),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
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
      return errorResponse(404, 'Invalid or expired discount code', { requestId });
    }

    // Check ticket limit if applicable
    if (discount.ticket_limit_type !== 'unlimited' && discount.ticket_limit_amount !== null) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .eq('status', 'confirmed');
    }

    return successResponse({
      valid: true,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      reveal_hidden_tickets: discount.reveal_hidden_tickets,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
