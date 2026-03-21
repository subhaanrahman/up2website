import { useState } from 'react';
import { callEdgeFunction } from '@/infrastructure/api-client';

interface VipReserveInput {
  event_id: string;
  vip_table_tier_id: string;
  guest_count: number;
  currency?: string;
  special_requests?: string;
}

interface VipReserveResult {
  reservation_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  expires_at: string;
}

interface VipPaymentIntentResult {
  client_secret: string;
  payment_intent_id: string;
  reservation_id: string;
}

export function useVipReservationFlow() {
  const [reserving, setReserving] = useState(false);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [reservation, setReservation] = useState<VipReserveResult | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reserve = async (input: VipReserveInput): Promise<VipReserveResult | null> => {
    setReserving(true);
    setError(null);
    try {
      const result = await callEdgeFunction<VipReserveResult>('vip-reserve', {
        body: input,
      });
      setReservation(result);
      return result;
    } catch (err: any) {
      setError(err?.message || 'Failed to reserve VIP table');
      return null;
    } finally {
      setReserving(false);
    }
  };

  const createPaymentIntent = async (reservationId: string): Promise<string | null> => {
    setCreatingIntent(true);
    setError(null);
    try {
      const result = await callEdgeFunction<VipPaymentIntentResult>('vip-payments-intent', {
        body: { reservation_id: reservationId },
      });
      setClientSecret(result.client_secret);
      return result.client_secret;
    } catch (err: any) {
      setError(err?.message || 'Failed to create VIP payment');
      return null;
    } finally {
      setCreatingIntent(false);
    }
  };

  const reset = () => {
    setReservation(null);
    setClientSecret(null);
    setError(null);
  };

  return {
    reserve,
    createPaymentIntent,
    reservation,
    clientSecret,
    error,
    reserving,
    creatingIntent,
    loading: reserving || creatingIntent,
    reset,
  };
}
