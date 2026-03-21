import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';

export interface DashboardAnalytics {
  total_revenue_cents: number;
  total_net_revenue_cents: number;
  total_attendees: number;
  net_tickets_sold: number;
  total_ticket_capacity: number;
  tickets_sold_pct: number;
  total_views: number;
  total_conversions: number;
  conversion_rate_pct: number;
  follower_count: number;
  vip_guestlist_count: number;
  vip_revenue_cents: number;
  vip_net_revenue_cents: number;
  vip_reservations: number;
  demographics: {
    follower_attendees: number;
    non_follower_attendees: number;
    new_attendees: number;
    returning_attendees: number;
    ticket_attendees: number;
    rsvp_only_attendees: number;
  };
  timeframe: string;
}

export const useDashboardAnalytics = (
  organiserProfileId: string | undefined,
  timeframe: string
) => {
  return useQuery({
    queryKey: ["dashboard-analytics", organiserProfileId, timeframe],
    queryFn: async (): Promise<DashboardAnalytics> => {
      const { data, error } = await supabase.functions.invoke("dashboard-analytics", {
        body: { organiser_profile_id: organiserProfileId, timeframe },
      });

      if (error) throw error;
      return data as DashboardAnalytics;
    },
    enabled: !!organiserProfileId,
    staleTime: 60_000,
  });
};
