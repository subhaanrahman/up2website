import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowed = await checkRateLimit('stripe-connect-onboard', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const { organiser_profile_id } = body;

    if (!organiser_profile_id) {
      return new Response(JSON.stringify({ error: 'organiser_profile_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify user is owner or member of this organiser profile
    const { data: isOwner } = await serviceClient.rpc('is_organiser_owner', {
      p_organiser_profile_id: organiser_profile_id,
      p_user_id: user.id,
    });

    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Only the owner can set up payouts' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      // Get organiser profile for prefill
      const { data: orgProfile } = await serviceClient
        .from('organiser_profiles')
        .select('display_name, username')
        .eq('id', organiser_profile_id)
        .single();

      // Create a new Express connected account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'ZA',
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

      // Store in DB
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

    // Create an Account Link for onboarding
    const origin = req.headers.get('origin') || 'https://social-soiree-site.lovable.app';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/organiser/edit`,
      return_url: `${origin}/organiser/edit?stripe_onboard=complete`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('stripe-connect-onboard error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
