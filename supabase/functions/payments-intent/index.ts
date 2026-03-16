import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

const paymentSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    // Auth
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

    // Rate limit
    const allowed = await checkRateLimit('payments-intent', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    // Validate input
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { order_id } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch and validate the order
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return errorResponse(404, 'Order not found', { requestId });
    }

    // Verify order is still reserved and not expired
    if (order.status !== 'reserved') {
      return errorResponse(400, `Order is ${order.status}, cannot create payment`, { requestId });
    }

    if (new Date(order.expires_at) < new Date()) {
      // Mark as expired
      await serviceClient
        .from('orders')
        .update({ status: 'expired' })
        .eq('id', order_id);

      return errorResponse(410, 'Reservation has expired. Please reserve again.', { requestId });
    }

    // If a payment intent already exists, return it
    if (order.stripe_payment_intent_id) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2025-08-27.basil',
      });

      const existingIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
      return successResponse({
        client_secret: existingIntent.client_secret,
        payment_intent_id: existingIntent.id,
        order_id: order.id,
      }, requestId);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-08-27.basil',
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Look up the organiser's connected Stripe account for destination charges
    const { data: event } = await serviceClient
      .from('events')
      .select('organiser_profile_id')
      .eq('id', order.event_id)
      .single();

    let stripeAccountId: string | null = null;
    if (event?.organiser_profile_id) {
      const { data: stripeAccount } = await serviceClient
        .from('organiser_stripe_accounts')
        .select('stripe_account_id, charges_enabled')
        .eq('organiser_profile_id', event.organiser_profile_id)
        .maybeSingle();

      if (stripeAccount?.charges_enabled) {
        stripeAccountId = stripeAccount.stripe_account_id;
      } else if (stripeAccount && !stripeAccount.charges_enabled) {
        return errorResponse(400, 'Organiser has not completed payout setup', { requestId });
      }
    }

    // Create payment intent — with destination charge if connected account exists
    const intentParams: any = {
      amount: order.amount_cents,
      currency: order.currency,
      customer: customerId,
      metadata: {
        order_id: order.id,
        event_id: order.event_id,
        user_id: user.id,
        quantity: String(order.quantity),
      },
      automatic_payment_methods: { enabled: true },
    };

    if (stripeAccountId) {
      intentParams.application_fee_amount = order.platform_fee_cents;
      intentParams.transfer_data = { destination: stripeAccountId };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    // Store payment intent ID and stripe account on the order
    await serviceClient
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_account_id: stripeAccountId,
      })
      .eq('id', order_id);

    return successResponse({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      order_id: order.id,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'Unexpected error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
