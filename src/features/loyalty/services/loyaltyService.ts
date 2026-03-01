// Loyalty service — reads from repo, writes via API

import { loyaltyRepository } from '../repositories/loyaltyRepository';
import type { UserPoints, Voucher, PointTransaction, UserRank } from '../domain/types';
import { createLogger } from '@/infrastructure/logger';

const logger = createLogger('loyalty.service');

export const loyaltyService = {
  async getUserPoints(userId: string): Promise<UserPoints> {
    const data = await loyaltyRepository.getUserPoints(userId);
    return data || { totalPoints: 0, currentRank: 'bronze' as UserRank };
  },

  async getVouchers(userId: string): Promise<Voucher[]> {
    return loyaltyRepository.getVouchers(userId);
  },

  async getTransactions(userId: string, limit?: number): Promise<PointTransaction[]> {
    return loyaltyRepository.getTransactions(userId, limit);
  },

  subscribeToPoints(userId: string, onChange: (pts: { totalPoints: number; currentRank: UserRank }) => void) {
    return loyaltyRepository.subscribeToPoints(userId, onChange);
  },
};
