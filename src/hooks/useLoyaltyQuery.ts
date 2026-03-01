// React Query hooks for loyalty (points, vouchers, transactions)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyService } from '@/features/loyalty';
import { loyaltyApi } from '@/api';
import type { PointAction } from '@/features/loyalty';
import { useAuth } from '@/contexts/AuthContext';

export const loyaltyKeys = {
  all: ['loyalty'] as const,
  points: (userId: string) => [...loyaltyKeys.all, 'points', userId] as const,
  vouchers: (userId: string) => [...loyaltyKeys.all, 'vouchers', userId] as const,
  transactions: (userId: string) => [...loyaltyKeys.all, 'transactions', userId] as const,
};

export function useUserPoints(userId: string | undefined) {
  return useQuery({
    queryKey: loyaltyKeys.points(userId!),
    queryFn: () => loyaltyService.getUserPoints(userId!),
    enabled: !!userId,
  });
}

export function useVouchers(userId: string | undefined) {
  return useQuery({
    queryKey: loyaltyKeys.vouchers(userId!),
    queryFn: () => loyaltyService.getVouchers(userId!),
    enabled: !!userId,
  });
}

export function useTransactions(userId: string | undefined) {
  return useQuery({
    queryKey: loyaltyKeys.transactions(userId!),
    queryFn: () => loyaltyService.getTransactions(userId!),
    enabled: !!userId,
  });
}

export function useAwardPoints() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, description }: { action: PointAction; description?: string }) =>
      loyaltyApi.awardPoints(action, description),
    onSuccess: () => {
      if (user) {
        qc.invalidateQueries({ queryKey: loyaltyKeys.points(user.id) });
        qc.invalidateQueries({ queryKey: loyaltyKeys.vouchers(user.id) });
        qc.invalidateQueries({ queryKey: loyaltyKeys.transactions(user.id) });
      }
    },
  });
}
