import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';

const EventAnalytics = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch the event details
  const { data: event } = useQuery({
    queryKey: ["event-for-analytics", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from("events")
        .select("id, title, organiser_profile_id")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch event-specific analytics
  const { data: eventOrders, isLoading } = useQuery({
    queryKey: ["event-orders-stats", id],
    queryFn: async () => {
      if (!id) return { totalRevenue: 0, netRevenue: 0, ticketsSold: 0, attendees: 0, views: 0, conversions: 0 };
      const { data: orders } = await supabase
        .from("orders")
        .select("amount_cents, platform_fee_cents, quantity, status")
        .eq("event_id", id)
        .eq("status", "confirmed");

      const totalRevenue = orders?.reduce((s, o) => s + o.amount_cents, 0) || 0;
      const netRevenue = orders?.reduce((s, o) => s + (o.amount_cents - (o.platform_fee_cents || 0)), 0) || 0;
      const ticketsSold = orders?.reduce((s, o) => s + o.quantity, 0) || 0;

      const { count: attendees } = await supabase
        .from("rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "going");

      const { count: views } = await supabase
        .from("event_views")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id);

      const { count: conversions } = await supabase
        .from("event_link_conversions")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id);

      return {
        totalRevenue,
        netRevenue,
        ticketsSold,
        attendees: attendees || 0,
        views: views || 0,
        conversions: conversions || 0,
      };
    },
    enabled: !!id,
  });

  const conversionRate = eventOrders?.views ? Math.round(((eventOrders?.conversions || 0) / eventOrders.views) * 100) : 0;

  const stats = [
    { label: "Revenue", value: `R${((eventOrders?.totalRevenue || 0) / 100).toFixed(2)}` },
    { label: "Net Revenue", value: `R${((eventOrders?.netRevenue || 0) / 100).toFixed(2)}` },
    { label: "Tickets Sold", value: eventOrders?.ticketsSold || 0 },
    { label: "Attendees (RSVP)", value: eventOrders?.attendees || 0 },
    { label: "Views", value: eventOrders?.views || 0 },
    { label: "Conversion", value: `${conversionRate}%` },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Event Analytics</h1>
        </div>
      </header>

      <main className="px-4 pt-6 space-y-6">
        {event && (
          <p className="text-lg font-semibold text-foreground capitalize">{event.title}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-tile-sm bg-card border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default EventAnalytics;
