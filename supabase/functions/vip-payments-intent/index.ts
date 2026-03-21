import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getClientIp, rateLimitResponse } from "../_shared/rate-limit.ts";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";
import { isPaymentsDisabled, paymentsDisabledResponse } from "../_shared/payments-disabled.ts";

const paymentSchema = z.object({
  reservation_id: z.string().uuid('Invalid reservation ID'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  if (isPaymentsDisabled()) {
    edgeLog('warn', 'vip-payments-intent blocked: PAYMENTS_DISABLED', { requestId });
    return paymentsDisabledResponse(requestId);
  }

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

    const allowed = await checkRateLimit('vip-payments-intent', user.id, getClientIp(req));
    if (!allowed) return rateLimitResponse(corsHeaders);

    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Invalid input', { requestId, details: parsed.error.flatten().fieldErrors });
    }

    const { reservation_id } = parsed.data;

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: reservation, error: reservationError } = await serviceClient
      .from('vip_table_reservations')
      .select('*')
      .eq('id', reservation_id)
      .eq('user_id', user.id)
      .single();

    if (reservationError || !reservation) {
      return errorResponse(404, 'VIP reservation not found', { requestId });
    }

    if (reservation.status !== 'reserved') {
      return errorResponse(400, `Reservation is ${reservation.status}, cannot create payment`, { requestId });
    }

    if (new Date(reservation.expires_at) < new Date()) {
      await serviceClient
        .from('vip_table_reservations')
        .update({ status: 'expired' })
        .eq('id', reservation_id);

      return errorResponse(410, 'Reservation has expired. Please reserve again.', { requestId });
    }

    if (reservation.stripe_payment_intent_id) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2025-08-27.basil',
      });

      const existingIntent = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);
      return successResponse({
        client_secret: existingIntent.client_secret,
        payment_intent_id: existingIntent.id,
        reservation_id: reservation.id,
      }, requestId);
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2025-08-27.basil',
    });

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

    const { data: event } = await serviceClient
      .from('events')
      .select('organiser_profile_id')
      .eq('id', reservation.event_id)
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

    const intentParams: any = {
      amount: reservation.amount_cents,
      currency: reservation.currency,
      customer: customerId,
      metadata: {
        reservation_type: 'vip_table',
        vip_reservation_id: reservation.id,
        event_id: reservation.event_id,
        user_id: user.id,
        guest_count: String(reservation.guest_count),
      },
      automatic_payment_methods: { enabled: true },
    };

    if (stripeAccountId) {
      intentParams.application_fee_amount = reservation.platform_fee_cents;
      intentParams.transfer_data = { destination: stripeAccountId };
    }

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    await serviceClient
      .from('vip_table_reservations')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_account_id: stripeAccountId,
      })
      .eq('id', reservation_id);

    return successResponse({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      reservation_id: reservation.id,
    }, requestId);
  } catch (err) {
    edgeLog('error', 'vip-payments-intent error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
