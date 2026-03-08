import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, TrendingDown, Clock, Pencil, Settings, ScanLine } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { format, isPast } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ManageEventModal from "@/components/ManageEventModal";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

const EventRow = ({ event, rsvpCount, onManage }: { event: any; rsvpCount: number; onManage: () => void }) => {
  const navigate = useNavigate();
  const isDraft = event.status === 'draft';

  return (
    <div className="flex items-center bg-card rounded-2xl overflow-hidden">
      <Link to={`/events/${event.id}`} className="flex items-center flex-1 min-w-0 hover:bg-card/80 transition-colors">
        <div className="w-24 h-24 flex-shrink-0 relative">
          <img
            src={event.cover_image || getEventFlyer(event.id)}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          {isDraft && (
            <Badge variant="secondary" className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5">
              Draft
            </Badge>
          )}
        </div>
        <div className="flex-1 px-3 py-2 min-w-0">
          <h3 className="font-bold text-sm text-foreground line-clamp-1 capitalize leading-tight">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[11px] bg-secondary px-2 py-1 rounded-full text-muted-foreground font-medium">
              {format(new Date(event.event_date), "EEE M/d")}
            </span>
            <span className="text-[11px] bg-secondary px-2 py-1 rounded-full text-muted-foreground font-medium">
              {rsvpCount} going
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-1 pr-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.preventDefault(); navigate(`/events/${event.id}/edit`); }}
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.preventDefault(); onManage(); }}
          title="Manage"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.preventDefault(); navigate(`/events/${event.id}/checkin`); }}
          title="Check In"
        >
          <ScanLine className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const OrganiserDashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState("past_month");
  const [manageEvent, setManageEvent] = useState<{ id: string; title: string } | null>(null);
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

  const now = new Date();
  const filtered = events?.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const upcomingEvents = filtered
    ?.filter((e) => new Date(e.event_date) >= now && e.status !== 'draft')
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const pastEvents = filtered
    ?.filter((e) => new Date(e.event_date) < now && e.status !== 'draft')
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const draftEvents = filtered
    ?.filter((e) => e.status === 'draft');

  const renderEventList = (list: typeof events) => {
    if (!list || list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No events</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {list.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            rsvpCount={rsvpCounts?.[event.id] || 0}
            onManage={() => setManageEvent({ id: event.id, title: event.title })}
          />
        ))}
      </div>
    );
  };

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

      {/* Events List with Tabs */}
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
                <div className="w-24 h-24 bg-secondary rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-secondary rounded" />
                  <div className="h-4 w-1/2 bg-secondary rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
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
            <TabsContent value="upcoming">
              {renderEventList(upcomingEvents)}
            </TabsContent>
            <TabsContent value="past">
              {renderEventList(pastEvents)}
            </TabsContent>
            <TabsContent value="draft">
              {renderEventList(draftEvents)}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {manageEvent && (
        <ManageEventModal
          open={!!manageEvent}
          onOpenChange={(open) => { if (!open) setManageEvent(null); }}
          eventId={manageEvent.id}
          eventTitle={manageEvent.title}
        />
      )}
    </div>
  );
};

export default OrganiserDashboard;
