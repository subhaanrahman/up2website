import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { format, isPast } from "date-fns";

interface StatCardProps {
  label: string;
  value: string;
  trend: number;
}

const StatCard = ({ label, value, trend }: StatCardProps) => {
  const isPositive = trend >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Akira Expanded', sans-serif", fontWeight: 900, fontStretch: 'expanded', letterSpacing: '0.05em' }}>{value}</span>
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="h-3 w-3 text-green-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500" />
        )}
        <span className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? "+" : ""}{trend}%
        </span>
      </div>
    </div>
  );
};

const OrganiserDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTab, setEventTab] = useState<"upcoming" | "past">("upcoming");
  const { activeProfile } = useActiveProfile();

  const { data: events, isLoading } = useQuery({
    queryKey: ["organiser-events", activeProfile?.id],
    queryFn: async () => {
      if (!activeProfile?.id) return [];

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organiser_profile_id", activeProfile.id)
        .order("event_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProfile?.id,
  });

  const { data: rsvpCounts } = useQuery({
    queryKey: ["organiser-rsvp-counts", activeProfile?.id],
    queryFn: async () => {
      if (!events?.length) return {};
      const eventIds = events.map((e) => e.id);
      const { data, error } = await supabase
        .from("rsvps")
        .select("event_id")
        .in("event_id", eventIds)
        .eq("status", "going");

      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((r) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!events?.length,
  });

  const totalAttendees = rsvpCounts
    ? Object.values(rsvpCounts).reduce((sum, c) => sum + c, 0)
    : 0;
  const totalEvents = events?.length || 0;
  const upcomingEvents = events?.filter((e) => !isPast(new Date(e.event_date))).length || 0;

  const filteredEvents = events
    ?.filter((e) => {
      const past = isPast(new Date(e.event_date));
      return eventTab === "past" ? past : !past;
    })
    .filter((e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.event_date).getTime();
      const dateB = new Date(b.event_date).getTime();
      // Upcoming: ascending (soonest first), Past: descending (most recent first)
      return eventTab === "upcoming" ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">DASHBOARD</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance and Analytics</p>
      </header>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Total Events" value={String(totalEvents)} trend={0} />
        <StatCard label="Total Attendees" value={String(totalAttendees)} trend={totalAttendees > 0 ? 15 : 0} />
        <StatCard label="Upcoming" value={String(upcomingEvents)} trend={0} />
        <StatCard label="Conversion Rate" value="—" trend={0} />
      </div>

      {/* Events List */}
      <div className="px-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="font-semibold text-foreground">Events</span>
          <div className="relative flex-1 max-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-0 h-9 text-sm"
            />
          </div>
        </div>

        {/* Upcoming / Past tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setEventTab("upcoming")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              eventTab === "upcoming"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setEventTab("past")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              eventTab === "past"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            Past
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-card rounded-xl animate-pulse">
                <div className="w-28 h-20 bg-secondary rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const past = isPast(new Date(event.event_date));
              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-4 bg-card rounded-xl overflow-hidden hover:bg-card/80 transition-colors"
                >
                  <div className="w-28 h-24 flex-shrink-0">
                    <img
                      src={event.cover_image || "/placeholder.svg"}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 py-3 pr-2">
                    <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                        {format(new Date(event.event_date), "EEE M/d • h:mma")}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${past ? "bg-muted text-muted-foreground" : "bg-secondary text-muted-foreground"}`}>
                        {past ? "Past" : "Upcoming"}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground mr-4 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p>No events yet</p>
            <p className="text-sm mt-1">Create your first event to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganiserDashboard;
