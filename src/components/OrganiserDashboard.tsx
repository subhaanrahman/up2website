import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { format, isPast } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";

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

  const filteredEvents = events
    ?.filter((e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-4">
        <h1
          className="text-2xl font-bold text-foreground uppercase"
          style={{ fontFamily: "'Akira Expanded', sans-serif", fontWeight: 900, fontStretch: 'expanded', letterSpacing: '0.05em' }}
        >
          Dashboard
        </h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted-foreground">Performance and Analytics</p>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            <Clock className="h-3 w-3" />
            Past Month
          </span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Total Revenue" value="$0" trend={0} />
        <StatCard label="Total Attendees" value={String(totalAttendees)} trend={totalAttendees > 0 ? 15 : 0} />
        <StatCard label="Total Views" value="0" trend={0} />
        <StatCard label="Conversion Rate" value="0%" trend={0} />
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

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-card rounded-2xl animate-pulse">
                <div className="w-28 h-28 bg-secondary rounded-lg" />
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
                  className="flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors"
                >
                   <div className="w-28 h-28 flex-shrink-0">
                    <img
                      src={getEventFlyer(event.id)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 px-4 py-3 min-w-0">
                    <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-3 capitalize leading-tight">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
                        {format(new Date(event.event_date), "EEE M/d - ha")}
                      </span>
                      <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
                        {past ? "Past" : "Upcoming"}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
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