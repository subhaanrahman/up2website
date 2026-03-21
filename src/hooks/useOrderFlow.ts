import { useState } from 'react';
import { callEdgeFunction } from '@/infrastructure/api-client';
import { getValidReferralClickId } from '@/utils/tracking';

interface ReserveInput {
  event_id: string;
  ticket_tier_id: string;
  quantity: number;
  currency?: string;
}

interface ReserveResult {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  expires_at: string;
}

interface PaymentIntentResult {
  client_secret: string;
  payment_intent_id: string;
  order_id: string;
}

export function useOrderFlow() {
  const [reserving, setReserving] = useState(false);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [order, setOrder] = useState<ReserveResult | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reserve = async (input: ReserveInput): Promise<ReserveResult | null> => {
    setReserving(true);
    setError(null);
    try {
      const referral_click_id = getValidReferralClickId(input.event_id) || undefined;
      const result = await callEdgeFunction<ReserveResult>('orders-reserve', {
        body: { ...input, referral_click_id },
      });
      setOrder(result);
      return result;
    } catch (err: any) {
      setError(err?.message || 'Failed to reserve tickets');
      return null;
    } finally {
      setReserving(false);
    }
  };

  const createPaymentIntent = async (orderId: string): Promise<string | null> => {
    setCreatingIntent(true);
    setError(null);
    try {
      const result = await callEdgeFunction<PaymentIntentResult>('payments-intent', {
        body: { order_id: orderId },
      });
      setClientSecret(result.client_secret);
      return result.client_secret;
    } catch (err: any) {
      setError(err?.message || 'Failed to create payment');
      return null;
    } finally {
      setCreatingIntent(false);
    }
  };

  const cancel = async (orderId: string): Promise<boolean> => {
    try {
      await callEdgeFunction('orders-cancel', { body: { order_id: orderId } });
      if (order?.id === orderId) setOrder(null);
      setClientSecret(null);
      return true;
    } catch {
      return false;
    }
  };

  const reset = () => {
    setOrder(null);
    setClientSecret(null);
    setError(null);
  };

  return {
    reserve,
    createPaymentIntent,
    cancel,
    reset,
    order,
    clientSecret,
    error,
    reserving,
    creatingIntent,
    loading: reserving || creatingIntent,
  };
}
