import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

function resolveAppOrigin(req: Request): string | null {
  const headerOrigin = req.headers.get('origin')?.trim();
  if (headerOrigin) return headerOrigin.replace(/\/+$/, '');

  const envOrigin =
    Deno.env.get('APP_ORIGIN')?.trim()
    || Deno.env.get('PUBLIC_APP_URL')?.trim()
    || Deno.env.get('SITE_URL')?.trim();

  if (!envOrigin) return null;
  return envOrigin.replace(/\/+$/, '');
}

function getUserFacingError(err: unknown, requestId: string): string {
  const errStr = String(err);
  const msg = err instanceof Error ? err.message : errStr;
  // Stripe key missing or wrong format (e.g. pk_ instead of sk_)
  if (!Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_')) {
    return 'Stripe is not configured. Add STRIPE_SECRET_KEY (starts with sk_) to Supabase Dashboard → Project Settings → Edge Functions.';
  }
  // Stripe API key errors
  if (errStr.includes('Invalid API Key') || errStr.includes('No API key') || msg.includes('invalid') && msg.toLowerCase().includes('key')) {
    return 'Invalid Stripe API key. Use a secret key (sk_test_ or sk_live_) in Supabase Edge Function secrets.';
  }
  // Email required for Express account
  if (msg.toLowerCase().includes('email')) {
    return 'Email required for payout setup. Please add an email to your account in Settings.';
  }
  // DB RPC or migration issues
  if (msg.includes('function') && msg.includes('does not exist')) {
    return 'Database configuration error. Ensure migrations are applied.';
  }
  if (errStr.includes('RPC') || errStr.includes('is_organiser_owner')) {
    return 'Authorization check failed. Ensure you are the owner of this organiser profile.';
  }
  if (msg.includes('not currently supported') || /not supported.*country/i.test(msg)) {
    return (
      `Stripe Connect does not support this country for Express accounts (or it is disabled for your Stripe account). ` +
      `Set Edge secret STRIPE_CONNECT_DEFAULT_COUNTRY to a supported ISO code (e.g. AU) or pass country in the onboard request. ` +
      `Request ID: ${requestId}`
    );
  }
  // Surface Stripe error message when safe (e.g. "Account already exists")
  if (err instanceof Error && err.message && err.message.length < 120 && !err.message.includes('sk_')) {
    return `Payout setup failed: ${err.message}. Request ID: ${requestId}`;
  }
  return `Payout setup failed. Request ID: ${requestId} — share this when contacting support.`;
}

/** ISO 3166-1 alpha-2 for Connect account country. Default AU (platform); override via body.country or STRIPE_CONNECT_DEFAULT_COUNTRY. */
function resolveConnectCountry(body: { country?: string }): string {
  const fromBody = body.country?.trim().toUpperCase();
  if (fromBody && /^[A-Z]{2}$/.test(fromBody)) {
    return fromBody;
  }
  const fromEnv = Deno.env.get('STRIPE_CONNECT_DEFAULT_COUNTRY')?.trim().toUpperCase();
  if (fromEnv && /^[A-Z]{2}$/.test(fromEnv)) {
    return fromEnv;
  }
  return 'AU';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')?.trim()) {
      edgeLog('error', 'STRIPE_SECRET_KEY not set', { requestId });
      return errorResponse(500, 'Stripe is not configured. Add STRIPE_SECRET_KEY to Supabase Dashboard → Project Settings → Edge Functions.', { requestId });
    }

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

    const allowed = await checkRateLimit('stripe-connect-onboard', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    let body: { organiser_profile_id?: string; country?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, 'Invalid request body', { requestId });
    }
    const { organiser_profile_id } = body || {};
    const connectCountry = resolveConnectCountry(body || {});

    if (!organiser_profile_id) {
      return errorResponse(400, 'organiser_profile_id is required', { requestId });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: isOwner, error: rpcError } = await serviceClient.rpc('is_organiser_owner', {
      p_organiser_profile_id: organiser_profile_id,
      p_user_id: user.id,
    });

    if (rpcError) {
      edgeLog('error', 'is_organiser_owner RPC failed', { requestId, error: String(rpcError) });
      return errorResponse(500, 'Authorization check failed. Ensure you are the owner of this organiser profile. Request ID: ' + requestId, { requestId });
    }

    if (!isOwner) {
      return errorResponse(403, 'Only the owner can set up payouts', { requestId });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-08-27.basil',
    });

    // Check if a Stripe account already exists for this organiser
    const { data: existing } = await serviceClient
      .from('organiser_stripe_accounts')
      .select('*')
      .eq('organiser_profile_id', organiser_profile_id)
      .maybeSingle();

    let stripeAccountId: string;

    if (existing) {
      stripeAccountId = existing.stripe_account_id;
    } else {
      if (!user.email?.trim()) {
        return errorResponse(400, 'Email required for payout setup. Please add an email to your account in Settings.', { requestId });
      }
      const { data: orgProfile } = await serviceClient
        .from('organiser_profiles')
        .select('display_name, username')
        .eq('id', organiser_profile_id)
        .single();

      const account = await stripe.accounts.create({
        type: 'express',
        country: connectCountry,
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: orgProfile?.display_name || undefined,
        },
        metadata: {
          organiser_profile_id,
          user_id: user.id,
        },
      });

      stripeAccountId = account.id;

      await serviceClient
        .from('organiser_stripe_accounts')
        .insert({
          organiser_profile_id,
          stripe_account_id: stripeAccountId,
          onboarding_complete: false,
          charges_enabled: false,
          payouts_enabled: false,
        });
    }

    const origin = resolveAppOrigin(req);
    if (!origin) {
      edgeLog('error', 'Missing app origin for Stripe Connect redirect URLs', { requestId });
      return errorResponse(
        500,
        'App origin is not configured. Set APP_ORIGIN (or PUBLIC_APP_URL / SITE_URL) in Edge Function secrets.',
        { requestId },
      );
    }

    const orgQuery = new URLSearchParams();
    orgQuery.set('org', organiser_profile_id);
    orgQuery.set('stripe_onboard', 'refresh');
    const refreshUrl = `${origin}/profile/edit-organiser?${orgQuery.toString()}`;

    const returnQuery = new URLSearchParams();
    returnQuery.set('org', organiser_profile_id);
    returnQuery.set('stripe_onboard', 'complete');
    const returnUrl = `${origin}/profile/edit-organiser?${returnQuery.toString()}`;

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return successResponse({ url: accountLink.url }, requestId);
  } catch (err) {
    edgeLog('error', 'stripe-connect-onboard error', { requestId, error: String(err) });
    const msg = getUserFacingError(err, requestId);
    return errorResponse(500, msg, { requestId });
  }
});
