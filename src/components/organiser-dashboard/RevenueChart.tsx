import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface RevenueChartProps {
  organiserProfileId: string;
}

const RevenueChart = ({ organiserProfileId }: RevenueChartProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["revenue-by-event", organiserProfileId],
    queryFn: async () => {
      // Get events for this organiser
      const { data: events } = await supabase
        .from("events")
        .select("id, title")
        .eq("organiser_profile_id", organiserProfileId);

      if (!events?.length) return [];

      const eventIds = events.map((e) => e.id);

      // Get confirmed orders for these events
      const { data: orders } = await supabase
        .from("orders")
        .select("event_id, amount_cents, quantity")
        .in("event_id", eventIds)
        .eq("status", "confirmed");

      // Aggregate by event
      const revenueMap: Record<string, { revenue: number; tickets: number }> = {};
      (orders || []).forEach((o) => {
        if (!revenueMap[o.event_id]) revenueMap[o.event_id] = { revenue: 0, tickets: 0 };
        revenueMap[o.event_id].revenue += o.amount_cents;
        revenueMap[o.event_id].tickets += o.quantity;
      });

      return events
        .map((e) => ({
          name: e.title.length > 15 ? e.title.slice(0, 15) + "…" : e.title,
          revenue: (revenueMap[e.id]?.revenue || 0) / 100,
          tickets: revenueMap[e.id]?.tickets || 0,
        }))
        .filter((d) => d.revenue > 0 || d.tickets > 0)
        .slice(0, 8);
    },
    enabled: !!organiserProfileId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 h-48 animate-pulse" />
    );
  }

  if (!chartData?.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground py-8">No revenue data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Revenue by Event</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => `R${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`R${value.toFixed(0)}`, "Revenue"]}
          />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
