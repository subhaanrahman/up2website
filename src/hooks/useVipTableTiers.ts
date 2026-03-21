import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase';

export interface VipTableTier {
  id: string;
  name: string;
  description: string | null;
  minSpendCents: number;
  availableQuantity: number;
  availableRemaining: number;
  maxGuests: number;
  includedItems: string[];
  sortOrder: number;
  soldOut: boolean;
}

export function useVipTableTiers(eventId: string | undefined) {
  return useQuery({
    queryKey: ['vip-table-tiers', eventId],
    queryFn: async (): Promise<VipTableTier[]> => {
      const { data, error } = await supabase
        .rpc('get_vip_table_tiers_public', { p_event_id: eventId! });

      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        minSpendCents: t.min_spend_cents,
        availableQuantity: t.available_quantity,
        availableRemaining: t.available_remaining ?? 0,
        maxGuests: t.max_guests,
        includedItems: t.included_items || [],
        sortOrder: t.sort_order,
        soldOut: !!t.sold_out,
      }));
    },
    enabled: !!eventId,
  });
}
