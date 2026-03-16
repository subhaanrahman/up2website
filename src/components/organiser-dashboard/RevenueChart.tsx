import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  addDays,
  addWeeks,
  addMonths,
  format,
} from "date-fns";
import type { DashboardAnalytics } from "@/hooks/useDashboardAnalytics";

interface RevenueChartProps {
  organiserProfileId: string;
  timeframe: string;
  analytics?: DashboardAnalytics;
}

type ChartMetric = "revenue" | "tickets" | "views" | "conversion";

interface TimeBucket {
  start: Date;
  end: Date;
  label: string;
}

const buildTimeBuckets = (timeframe: string): TimeBucket[] => {
  const now = new Date();
  let rangeStart: Date;
  let rangeEnd: Date = now;

  // Define the time range based on timeframe
  switch (timeframe) {
    case "past_week":
      rangeStart = addDays(now, -7);
      break;
    case "past_month":
      rangeStart = addMonths(now, -1);
      break;
    case "past_3_months":
      rangeStart = addMonths(now, -3);
      break;
    case "past_year":
      rangeStart = addMonths(now, -12);
      break;
    case "all_time":
    default:
      rangeStart = addMonths(now, -12);
      break;
  }

  const buckets: TimeBucket[] = [];
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const stepMs = totalMs / 8;

  for (let i = 0; i < 8; i++) {
    const start = new Date(rangeStart.getTime() + stepMs * i);
    const end = i === 7 ? rangeEnd : new Date(rangeStart.getTime() + stepMs * (i + 1));
    const label = format(startOfDay(start), "dd/MM");
    buckets.push({ start, end, label });
  }

  return buckets;
};

const RevenueChart = ({ organiserProfileId, timeframe, analytics }: RevenueChartProps) => {
  const [metric, setMetric] = useState<ChartMetric>("revenue");

  const { data: chartData, isLoading } = useQuery({
    queryKey: ["revenue-by-event", organiserProfileId, timeframe],
    queryFn: async () => {
      // Get events for this organiser (for filtering orders)
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("organiser_profile_id", organiserProfileId);

      if (!events?.length) return [];

      const eventIds = events.map((e) => e.id);

      // Get confirmed orders for these events within the approximate timeframe
      const buckets = buildTimeBuckets(timeframe);
      const earliestBucketStart = buckets[0]?.start;

      const { data: orders } = await supabase
        .from("orders")
        .select("event_id, amount_cents, quantity, created_at")
        .in("event_id", eventIds)
        .eq("status", "confirmed")
        .order("created_at", { ascending: true });

      const filteredOrders =
        earliestBucketStart && orders
          ? orders.filter((o) => o.created_at && new Date(o.created_at) >= earliestBucketStart)
          : orders || [];

      // Aggregate into time buckets
      const bucketTotals: Record<string, { revenueCents: number; tickets: number }> = {};
      buckets.forEach((b) => {
        bucketTotals[b.label] = { revenueCents: 0, tickets: 0 };
      });

      filteredOrders.forEach((o) => {
        if (!o.created_at) return;
        const created = new Date(o.created_at);
        const bucket = buckets.find((b) => created >= b.start && created < b.end);
        if (!bucket) return;
        const totals = bucketTotals[bucket.label] || { revenueCents: 0, tickets: 0 };
        totals.revenueCents += o.amount_cents;
        totals.tickets += o.quantity;
        bucketTotals[bucket.label] = totals;
      });

      // Build chart data in chronological order of buckets
      return buckets.map((b) => {
        const totals = bucketTotals[b.label] || { revenueCents: 0, tickets: 0 };
        return {
          date: b.label,
          revenue: totals.revenueCents / 100,
          tickets: totals.tickets,
        };
      });
    },
    enabled: !!organiserProfileId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 h-48 animate-pulse" />
    );
  }

  if (!chartData?.length && (metric === "revenue" || metric === "tickets")) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground py-8">No revenue data yet</p>
      </div>
    );
  }

  // Build display data depending on the selected metric
  const timeBuckets = buildTimeBuckets(timeframe);

  let displayData: { date: string; value: number }[] = [];
  let dataKey: "revenue" | "tickets" | "value" = "revenue";

  if (metric === "revenue" || metric === "tickets") {
    dataKey = metric;
  } else if (metric === "views") {
    const totalViews = analytics?.total_views ?? 0;
    const perBucket = timeBuckets.length > 0 ? totalViews / timeBuckets.length : 0;
    displayData = timeBuckets.map((b) => ({
      date: b.label,
      value: perBucket,
    }));
    dataKey = "value";
  } else if (metric === "conversion") {
    const conv = analytics?.conversion_rate_pct ?? 0;
    displayData = timeBuckets.map((b) => ({
      date: b.label,
      value: conv,
    }));
    dataKey = "value";
  }

  const finalData =
    metric === "revenue" || metric === "tickets"
      ? (chartData as any[])
      : displayData;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground font-display tracking-[0.08em] uppercase">
          PERFORMANCE
        </h3>
        <Select value={metric} onValueChange={(v) => setMetric(v as ChartMetric)}>
          <SelectTrigger className="h-8 w-[180px] border-0 bg-secondary px-3 py-1.5 rounded-full text-[11px] text-muted-foreground shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue</SelectItem>
            <SelectItem value="tickets">Tickets Sold</SelectItem>
            <SelectItem value="views">Views / Impressions</SelectItem>
            <SelectItem value="conversion">Conversion Rate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={finalData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval={0}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickFormatter={(v) =>
              metric === "revenue"
                ? `R${v}`
                : metric === "conversion"
                ? `${v}%`
                : v
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => {
              if (metric === "revenue") {
                return [`R${value.toFixed(0)}`, "Revenue"];
              }
              if (metric === "tickets") {
                return [value.toFixed(0), "Tickets Sold"];
              }
              if (metric === "views") {
                return [value.toFixed(0), "Views / Impressions"];
              }
              return [`${value.toFixed(1)}%`, "Conversion Rate"];
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
