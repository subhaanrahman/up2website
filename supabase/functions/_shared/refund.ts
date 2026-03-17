/**
 * Shared refund logic: create Stripe refund, update order, cancel tickets, insert refunds record.
 * Used by refunds-create and events-update (event cancellation).
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type Stripe from "https://esm.sh/stripe@18.5.0";

export interface ProcessRefundParams {
  orderId: string;
  amountCents?: number; // full refund if omitted
  reason: string;
  initiatedBy: string | null;
  stripe: Stripe;
  serviceClient: SupabaseClient;
}

export interface ProcessRefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export async function processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult> {
  const { orderId, amountCents, reason, initiatedBy, stripe, serviceClient } = params;

  const { data: order, error: orderErr } = await serviceClient
    .from("orders")
    .select("id, stripe_payment_intent_id, amount_cents, status")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return { success: false, error: "Order not found" };
  }

  if (order.status !== "confirmed") {
    return { success: false, error: `Order is ${order.status}, cannot refund` };
  }

  if (!order.stripe_payment_intent_id) {
    return { success: false, error: "No payment intent for this order" };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
  const chargeId = typeof paymentIntent.latest_charge === "string"
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge?.id;

  if (!chargeId) {
    return { success: false, error: "No charge found for this payment" };
  }

  const refundAmount = amountCents ?? order.amount_cents;

  const refund = await stripe.refunds.create({
    charge: chargeId,
    amount: refundAmount,
    reason: "requested_by_customer",
    metadata: { order_id: orderId, initiated_by: initiatedBy ?? "" },
  });

  const now = new Date().toISOString();

  await serviceClient
    .from("orders")
    .update({ status: "refunded", cancelled_at: now })
    .eq("id", orderId);

  await serviceClient
    .from("tickets")
    .update({ status: "cancelled" })
    .eq("order_id", orderId);

  await serviceClient.from("refunds").insert({
    order_id: orderId,
    stripe_refund_id: refund.id,
    amount_cents: refundAmount,
    reason,
    status: "succeeded",
    initiated_by: initiatedBy,
  });

  return { success: true, refundId: refund.id };
}
