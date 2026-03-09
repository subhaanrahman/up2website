import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TicketTier {
  id: string;
  name: string;
  priceCents: number;
  availableQuantity: number | null;
  sortOrder: number;
}

export function useTicketTiers(eventId: string | undefined) {
  return useQuery({
    queryKey: ['ticket-tiers', eventId],
    queryFn: async (): Promise<TicketTier[]> => {
      const { data, error } = await supabase
        .from('ticket_tiers')
        .select('id, name, price_cents, available_quantity, sort_order')
        .eq('event_id', eventId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []).map((t) => ({
        id: t.id,
        name: t.name,
        priceCents: t.price_cents,
        availableQuantity: t.available_quantity,
        sortOrder: t.sort_order,
      }));
    },
    enabled: !!eventId,
  });
}
