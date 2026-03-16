import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Not authenticated', { requestId });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Invalid token', { requestId });
    }

    const allowed = await checkRateLimit('stripe-connect-dashboard', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const { organiser_profile_id } = body;

    if (!organiser_profile_id) {
      return errorResponse(400, 'organiser_profile_id is required', { requestId });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify ownership
    const { data: isOwner } = await serviceClient.rpc('is_organiser_owner', {
      p_organiser_profile_id: organiser_profile_id,
      p_user_id: user.id,
    });

    if (!isOwner) {
      return errorResponse(403, 'Only the owner can access the payout dashboard', { requestId });
    }

    const { data: record } = await serviceClient
      .from('organiser_stripe_accounts')
      .select('stripe_account_id')
      .eq('organiser_profile_id', organiser_profile_id)
      .maybeSingle();

    if (!record) {
      return errorResponse(404, 'Stripe account not set up', { requestId });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-08-27.basil',
    });

    const loginLink = await stripe.accounts.createLoginLink(record.stripe_account_id);

    return successResponse({ url: loginLink.url }, requestId);
  } catch (err) {
    edgeLog('error', 'stripe-connect-dashboard error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
