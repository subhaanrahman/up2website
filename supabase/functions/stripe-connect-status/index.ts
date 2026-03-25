import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { fetchStripeConnectAccountFlags } from "../_shared/stripe-account-fetch.ts";
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

    const allowed = await checkRateLimit('stripe-connect-status', user.id, getClientIp(req));
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

    // Verify user is owner or member
    const [{ data: isOwner }, { data: isMember }] = await Promise.all([
      serviceClient.rpc('is_organiser_owner', {
        p_organiser_profile_id: organiser_profile_id,
        p_user_id: user.id,
      }),
      serviceClient.rpc('is_organiser_member', {
        p_organiser_profile_id: organiser_profile_id,
        p_user_id: user.id,
      }),
    ]);

    if (!isOwner && !isMember) {
      return errorResponse(403, 'Access denied', { requestId });
    }

    // Get existing stripe account record
    const { data: record } = await serviceClient
      .from('organiser_stripe_accounts')
      .select('*')
      .eq('organiser_profile_id', organiser_profile_id)
      .maybeSingle();

    if (!record) {
      return successResponse({
        connected: false,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
        stripe_account_record_exists: false,
      }, requestId);
    }

    // Fetch latest status from Stripe (REST only — full SDK blows Edge memory / triggers 546)
    const {
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      details_submitted: detailsSubmitted,
    } = await fetchStripeConnectAccountFlags(record.stripe_account_id);

    await serviceClient
      .from('organiser_stripe_accounts')
      .update({
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        onboarding_complete: detailsSubmitted,
      })
      .eq('id', record.id);

    return successResponse({
      connected: true,
      stripe_account_id: record.stripe_account_id,
      onboarding_complete: detailsSubmitted,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      stripe_account_record_exists: true,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'stripe-connect-status error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
