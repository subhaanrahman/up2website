import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useProfile } from "@/hooks/useProfileQuery";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import OrganiserDashboard from "@/components/OrganiserDashboard";
import TicketEventCard, { type TicketStatus } from "@/components/TicketEventCard";
import ProfileQrModal from "@/components/ProfileQrModal";
import {
  startOfDay, startOfWeek, startOfMonth, subMonths, isAfter, isBefore
} from "date-fns";

interface TicketEvent {
  rsvpId: string;
  eventId: string;
  title: string;
  eventDate: string;
  ticketStatus: TicketStatus;
}

/* ── Time-group helpers ── */
type TimeGroup =
  | "this-week"
  | "this-month"
  | "upcoming"
  | "last-month"
  | "last-6-months"
  | "older";

const UPCOMING_GROUPS: TimeGroup[] = ["this-week", "this-month", "upcoming"];
const PAST_GROUPS: TimeGroup[] = ["last-month", "last-6-months", "older"];

const groupLabel: Record<TimeGroup, string> = {
  "this-week": "This Week",
  "this-month": "This Month",
  upcoming: "Upcoming",
  "last-month": "Last Month",
  "last-6-months": "Last 6 Months",
  older: "Older",
};

function getUpcomingGroup(date: Date, now: Date): TimeGroup {
  const weekEnd = new Date(startOfWeek(now, { weekStartsOn: 1 }));
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = new Date(startOfMonth(now));
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  if (isBefore(date, weekEnd)) return "this-week";
  if (isBefore(date, monthEnd)) return "this-month";
  return "upcoming";
}

function getPastGroup(date: Date, now: Date): TimeGroup {
  const monthStart = startOfMonth(now);
  const lastMonthStart = subMonths(monthStart, 1);
  const sixMonthsAgo = subMonths(monthStart, 6);

  if (isAfter(date, lastMonthStart)) return "last-month";
  if (isAfter(date, sixMonthsAgo)) return "last-6-months";
  return "older";
}

function groupEvents(events: TicketEvent[], groups: TimeGroup[], classifier: (d: Date, now: Date) => TimeGroup, now: Date) {
  const map = new Map<TimeGroup, TicketEvent[]>();
  for (const g of groups) map.set(g, []);
  for (const ev of events) {
    const g = classifier(new Date(ev.eventDate), now);
    map.get(g)!.push(ev);
  }
  return map;
}

/* ── Divider component ── */
function TimeDivider({ label, prominent = false }: { label: string; prominent?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`flex-1 h-px ${prominent ? "bg-border" : "bg-border/50"}`} />
      <span className={`text-xs font-medium uppercase tracking-wider ${prominent ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
        {label}
      </span>
      <div className={`flex-1 h-px ${prominent ? "bg-border" : "bg-border/50"}`} />
    </div>
  );
}

const Tickets = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const { user } = useAuth();
  const { isOrganiser } = useActiveProfile();
  const { data: profile } = useProfile(user?.id);
  const dividerRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // Fetch RSVPs + orders + saved events in parallel
  const { data: ticketEvents, isLoading } = useQuery({
    queryKey: ["user-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [rsvpResult, orderResult, savedResult] = await Promise.all([
        supabase
          .from("rsvps")
          .select(`id, status, event_id, events (id, title, event_date, cover_image, location)`)
          .eq("user_id", user.id)
          .in("status", ["going", "interested", "pending"]),
        supabase
          .from("orders")
          .select("event_id, status")
          .eq("user_id", user.id)
          .eq("status", "confirmed"),
        supabase
          .from("saved_events")
          .select("id, event_id, events (id, title, event_date, cover_image, location)")
          .eq("user_id", user.id),
      ]);

      if (rsvpResult.error) throw rsvpResult.error;

      const purchasedEventIds = new Set(
        (orderResult.data || []).map((o) => o.event_id)
      );

      // Build set of event IDs from RSVPs to avoid duplicates
      const rsvpEventIds = new Set(
        (rsvpResult.data || []).map((r) => r.event_id)
      );

      const rsvpEvents: TicketEvent[] = (rsvpResult.data || []).map((rsvp) => {
        let ticketStatus: TicketStatus;
        if (purchasedEventIds.has(rsvp.event_id)) {
          ticketStatus = "purchased";
        } else if (rsvp.status === "going") {
          ticketStatus = "going";
        } else if (rsvp.status === "pending") {
          ticketStatus = "pending";
        } else {
          ticketStatus = "interested";
        }
        return {
          rsvpId: rsvp.id,
          eventId: rsvp.event_id,
          title: (rsvp.events as any)?.title || "",
          eventDate: (rsvp.events as any)?.event_date || "",
          ticketStatus,
        };
      });

      // Add saved events that don't already have an RSVP
      const savedEvents: TicketEvent[] = (savedResult.data || [])
        .filter((s) => !rsvpEventIds.has(s.event_id))
        .map((s) => ({
          rsvpId: s.id,
          eventId: s.event_id,
          title: (s.events as any)?.title || "",
          eventDate: (s.events as any)?.event_date || "",
          ticketStatus: "saved" as TicketStatus,
        }));

      return [...rsvpEvents, ...savedEvents];
    },
    enabled: !!user?.id,
  });

  const now = useMemo(() => new Date(), []);

  const filtered = (ticketEvents || []).filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pastEvents = filtered
    .filter((t) => t.eventDate && new Date(t.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const upcomingEvents = filtered
    .filter((t) => t.eventDate && new Date(t.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const pastGrouped = groupEvents(pastEvents, PAST_GROUPS, getPastGroup, now);
  const upcomingGrouped = groupEvents(upcomingEvents, UPCOMING_GROUPS, getUpcomingGroup, now);

  const scrollToDivider = useCallback(() => {
    if (dividerRef.current && !hasScrolled.current && pastEvents.length > 0) {
      hasScrolled.current = true;
      setTimeout(() => {
        dividerRef.current?.scrollIntoView({ block: "start" });
      }, 100);
    }
  }, [pastEvents.length]);

  useEffect(() => {
    if (!isLoading && ticketEvents) {
      scrollToDivider();
    }
  }, [isLoading, ticketEvents, scrollToDivider]);

  const displayName = profile?.displayName || "";
  const username = profile?.username || displayName || user?.phone || "User";
  const avatarUrl = profile?.avatarUrl || "";
  const profileUrl = `${window.location.origin}/user/${user?.id}`;

  if (isOrganiser) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <OrganiserDashboard />
        <BottomNav />
      </div>
    );
  }

  const renderCard = (t: TicketEvent, isPast: boolean) => (
    <TicketEventCard
      key={t.rsvpId}
      rsvpId={t.rsvpId}
      eventId={t.eventId}
      title={t.title}
      eventDate={t.eventDate}
      isPast={isPast}
      ticketStatus={t.ticketStatus}
      onQrClick={() => setQrOpen(true)}
    />
  );

  const renderGroupedSection = (
    grouped: Map<TimeGroup, TicketEvent[]>,
    groupOrder: TimeGroup[],
    isPast: boolean,
  ) => {
    const elements: React.ReactNode[] = [];
    for (const group of groupOrder) {
      const items = grouped.get(group);
      if (!items || items.length === 0) continue;
      elements.push(
        <TimeDivider key={`divider-${group}`} label={groupLabel[group]} />
      );
      items.forEach((t) => elements.push(renderCard(t, isPast)));
    }
    return elements;
  };

  const allEvents = [...pastEvents, ...upcomingEvents];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile Tickets Page */}
      <div className="md:hidden">
        <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground mb-4 text-center">TICKETS</h1>
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-muted-foreground">Events</span>
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
        </header>

        <main className="px-4">
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
          ) : allEvents.length > 0 ? (
            <div className="space-y-3">
              {/* Past events grouped */}
              {renderGroupedSection(pastGrouped, [...PAST_GROUPS].reverse(), true)}

              {/* Today divider — prominent */}
              {pastEvents.length > 0 && (
                <div ref={dividerRef}>
                  <TimeDivider label="Today" prominent />
                </div>
              )}

              {/* Upcoming events grouped */}
              {upcomingEvents.length > 0 ? (
                renderGroupedSection(upcomingGrouped, UPCOMING_GROUPS, false)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No tickets yet</p>
              <p className="text-sm mt-1">RSVP or save events to see them here</p>
            </div>
          )}
        </main>
      </div>

      {/* Desktop View */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-2 text-center">My Tickets</h1>
          <p className="text-muted-foreground mb-8">Events you've RSVP'd to or saved</p>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
                  <div className="h-32 bg-secondary rounded-lg mb-4" />
                  <div className="h-5 bg-secondary rounded w-3/4 mb-2" />
                  <div className="h-4 bg-secondary rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : allEvents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...upcomingEvents, ...pastEvents].map((t) => (
                <TicketEventCard
                  key={t.rsvpId}
                  rsvpId={t.rsvpId}
                  eventId={t.eventId}
                  title={t.title}
                  eventDate={t.eventDate}
                  isPast={new Date(t.eventDate) < now}
                  ticketStatus={t.ticketStatus}
                  onQrClick={() => setQrOpen(true)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No tickets yet</p>
              <p className="text-sm mt-1">RSVP or save events to see them here</p>
            </div>
          )}
        </div>
      </main>

      <ProfileQrModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        displayName={displayName}
        username={username}
        avatarUrl={avatarUrl || undefined}
        profileUrl={profileUrl}
      />

      <BottomNav />
    </div>
  );
};

export default Tickets;
