import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ManageEventModal from "@/components/ManageEventModal";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
"@/components/ui/select";
import StatCard from "@/components/organiser-dashboard/StatCard";
import EventRow from "@/components/organiser-dashboard/EventRow";
import FollowersPromotionTab from "@/components/organiser-dashboard/FollowersPromotionTab";
import ActivityTab from "@/components/organiser-dashboard/ActivityTab";
import RevenueChart from "@/components/organiser-dashboard/RevenueChart";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";

const OrganiserDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState("past_month");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [manageEvent, setManageEvent] = useState<{id: string;title: string;} | null>(null);
  const { activeProfile } = useActiveProfile();

  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics(
    activeProfile?.id,
    timeframe
  );

  // Per-event stats when an event is selected
  const { data: eventStats, isLoading: eventStatsLoading } = useQuery({
    queryKey: ["event-stats-dashboard", selectedEventId],
    queryFn: async () => {
      if (selectedEventId === "all" || !selectedEventId) return null;
      const { data: orders } = await supabase
        .from("orders")
        .select("amount_cents, quantity, status")
        .eq("event_id", selectedEventId)
        .eq("status", "confirmed");
      const totalRevenue = orders?.reduce((s: number, o: any) => s + o.amount_cents, 0) || 0;
      const ticketsSold = orders?.reduce((s: number, o: any) => s + o.quantity, 0) || 0;
      const { count: attendees } = await supabase
        .from("rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", selectedEventId)
        .eq("status", "going");
      const { count: guestlist } = await supabase
        .from("rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", selectedEventId);
      return { totalRevenue, ticketsSold, attendees: attendees || 0, guestlist: guestlist || 0 };
    },
    enabled: selectedEventId !== "all",
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["organiser-events", activeProfile?.id],
    queryFn: async () => {
      if (!activeProfile?.id) return [];
      const { data, error } = await supabase.
      from("events").
      select("*").
      eq("organiser_profile_id", activeProfile.id).
      order("event_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProfile?.id
  });

  const { data: rsvpCounts } = useQuery({
    queryKey: ["organiser-rsvp-counts", activeProfile?.id],
    queryFn: async () => {
      if (!events?.length) return {};
      const eventIds = events.map((e) => e.id);
      const { data, error } = await supabase.
      from("rsvps").
      select("event_id").
      in("event_id", eventIds).
      eq("status", "going");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((r) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!events?.length
  });

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  };

  const now = new Date();
  const filtered = events?.filter((e) =>
  e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const upcomingEvents = filtered?.
  filter((e) => new Date(e.event_date) >= now && e.status !== "draft").
  sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const pastEvents = filtered?.
  filter((e) => new Date(e.event_date) < now && e.status !== "draft").
  sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const draftEvents = filtered?.filter((e) => e.status === "draft");

  const renderEventList = (list: typeof events) => {
    if (!list || list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No events</p>
        </div>);

    }
    return (
      <div className="space-y-3">
        {list.map((event) =>
        <EventRow
          key={event.id}
          event={event}
          rsvpCount={rsvpCounts?.[event.id] || 0}
          onManage={() => setManageEvent({ id: event.id, title: event.title })} />

        )}
      </div>);

  };

  const handleExportCSV = () => {
    if (!events?.length) return;
    const rows = events.map((e) => ({
      title: e.title,
      date: e.event_date,
      status: e.status,
      rsvps: rsvpCounts?.[e.id] || 0
    }));
    const header = "Title,Date,Status,RSVPs\n";
    const csv =
    header +
    rows.
    map((r) => `"${r.title}",${r.date},${r.status},${r.rsvps}`).
    join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "events-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-bold text-foreground uppercase text-center"
          style={{
            fontFamily: "'Akira Expanded', sans-serif",
            fontWeight: 900,
            fontStretch: "expanded",
            letterSpacing: "0.05em"
          }}>
          
          Dashboard
        </h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted-foreground">Performance and Analytics</p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleExportCSV}
              title="Export CSV">
              
              <Download className="h-4 w-4" />
            </Button>
            {events && events.length > 0 && (
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-auto w-auto max-w-[120px] gap-1.5 border-0 bg-secondary px-3 py-1.5 rounded-full text-xs text-muted-foreground shadow-none focus:ring-0 truncate">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-auto w-auto gap-1.5 border-0 bg-secondary px-3 py-1.5 rounded-full text-xs text-muted-foreground shadow-none focus:ring-0">
                <Clock className="h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="past_week">Past Week</SelectItem>
                <SelectItem value="past_month">Past Month</SelectItem>
                <SelectItem value="past_3_months">Past 3 Months</SelectItem>
                <SelectItem value="past_year">Past Year</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        {selectedEventId === "all" ? (
          <>
            <StatCard
              label="Total Revenue"
              value={analyticsLoading ? "..." : formatCurrency(analytics?.total_revenue_cents || 0)} />
            <StatCard
              label="Total Attendees"
              value={analyticsLoading ? "..." : String(analytics?.total_attendees || 0)} />
            <StatCard
              label="Net Tickets Sold"
              value={analyticsLoading ? "..." : String(analytics?.net_tickets_sold || 0)}
              subtitle={
              analytics?.total_ticket_capacity ?
              `${analytics.tickets_sold_pct}% of ${analytics.total_ticket_capacity} capacity` :
              undefined
              } />
            <StatCard
              label="VIP / Guestlist"
              value={analyticsLoading ? "..." : String(analytics?.vip_guestlist_count || 0)} />
            <StatCard
              label="Views / Impressions"
              value={analyticsLoading ? "..." : String(analytics?.total_views || 0)}
              subtitle="Tracking coming soon" />
            <StatCard
              label="Conversion Rate"
              value={analyticsLoading ? "..." : `${analytics?.conversion_rate_pct || 0}%`}
              subtitle="Orders ÷ Views" />
          </>
        ) : (
          <>
            <StatCard
              label="Revenue"
              value={eventStatsLoading ? "..." : formatCurrency(eventStats?.totalRevenue || 0)} />
            <StatCard
              label="Tickets Sold"
              value={eventStatsLoading ? "..." : String(eventStats?.ticketsSold || 0)} />
            <StatCard
              label="Attendees (RSVP)"
              value={eventStatsLoading ? "..." : String(eventStats?.attendees || 0)} />
            <StatCard
              label="Total RSVPs"
              value={eventStatsLoading ? "..." : String(eventStats?.guestlist || 0)} />
          </>
        )}
      </div>

      {/* Revenue / Performance Chart */}
      {activeProfile?.id && (
        <div className="px-4 mb-6">
          <RevenueChart
            organiserProfileId={activeProfile.id}
            timeframe={timeframe}
            analytics={analytics}
          />
        </div>
      )}

      {/* Main Tabs: Events / Followers / Activity */}
      <div className="px-4">
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
            <TabsTrigger value="followers" className="flex-1">Followers</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="font-semibold text-foreground">Events</span>
              <div className="relative flex-1 max-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary border-0 h-9 text-sm" />
                
              </div>
            </div>

            {isLoading ?
            <div className="space-y-3">
                {[1, 2, 3].map((i) =>
              <div key={i} className="flex items-center gap-4 p-3 bg-card rounded-2xl animate-pulse">
                    <div className="w-24 h-24 bg-secondary rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-3/4 bg-secondary rounded" />
                      <div className="h-4 w-1/2 bg-secondary rounded" />
                    </div>
                  </div>
              )}
              </div> :

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="upcoming" className="flex-1">
                    Upcoming{upcomingEvents?.length ? ` (${upcomingEvents.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="past" className="flex-1">
                    Past{pastEvents?.length ? ` (${pastEvents.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="draft" className="flex-1">
                    Draft{draftEvents?.length ? ` (${draftEvents.length})` : ""}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming">{renderEventList(upcomingEvents)}</TabsContent>
                <TabsContent value="past">{renderEventList(pastEvents)}</TabsContent>
                <TabsContent value="draft">{renderEventList(draftEvents)}</TabsContent>
              </Tabs>
            }
          </TabsContent>

          <TabsContent value="followers">
            <FollowersPromotionTab followerCount={analytics?.follower_count || 0} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>
        </Tabs>
      </div>

      {manageEvent &&
      <ManageEventModal
        open={!!manageEvent}
        onOpenChange={(open) => {if (!open) setManageEvent(null);}}
        eventId={manageEvent.id}
        eventTitle={manageEvent.title} />

      }
    </div>);

};

export default OrganiserDashboard;