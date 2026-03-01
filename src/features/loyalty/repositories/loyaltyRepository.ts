// Loyalty repository — read-only DB access on client

import { supabase } from '@/infrastructure/supabase';
import type { UserPoints, Voucher, PointTransaction, UserRank } from '../domain/types';

export const loyaltyRepository = {
  async getUserPoints(userId: string): Promise<UserPoints | null> {
    const { data, error } = await supabase
      .from('user_points')
      .select('total_points, current_rank')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      totalPoints: data.total_points,
      currentRank: data.current_rank as UserRank,
    };
  },

  async getVouchers(userId: string): Promise<Voucher[]> {
    const { data, error } = await supabase
      .from('user_vouchers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((v) => ({
      id: v.id,
      code: v.code,
      valueCents: v.value_cents,
      status: v.status,
      earnedAtRank: v.earned_at_rank as UserRank,
      expiresAt: v.expires_at,
      usedAt: v.used_at,
    }));
  },

  async getTransactions(userId: string, limit = 20): Promise<PointTransaction[]> {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((t) => ({
      id: t.id,
      points: t.points,
      actionType: t.action_type,
      description: t.description,
      createdAt: t.created_at,
    }));
  },

  subscribeToPoints(userId: string, onChange: (points: { totalPoints: number; currentRank: UserRank }) => void) {
    const channel = supabase
      .channel(`points_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_points', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const d = payload.new as { total_points: number; current_rank: string };
            onChange({ totalPoints: d.total_points, currentRank: d.current_rank as UserRank });
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};
