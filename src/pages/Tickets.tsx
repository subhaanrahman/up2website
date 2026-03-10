import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useUserPlannedEvents, useUserCreatedEvents } from "@/hooks/useUserEventsQuery";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import OrganiserDashboard from "@/components/OrganiserDashboard";
import TicketEventCard, { type TicketStatus } from "@/components/TicketEventCard";
import ProfileQrModal from "@/components/ProfileQrModal";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import {
  startOfWeek, startOfMonth, subMonths, isAfter, isBefore
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

/* ── Created event card ── */
function CreatedEventCard({ event, isPast }: { event: any; isPast: boolean }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className={`flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors ${isPast ? "opacity-60" : ""}`}
    >
      <div className="w-28 h-28 flex-shrink-0">
        {event.coverImage ? (
          <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <img src={getEventFlyer(event.id)} alt={event.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 px-4 py-3 min-w-0">
        <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-1 capitalize leading-tight">{event.title}</h3>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs bg-secondary px-3 py-1.5 rounded-full text-muted-foreground font-medium">
            {format(new Date(event.eventDate), "EEE M/d - ha")}
          </span>
          {event.status === "draft" && (
            <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-1 rounded-full font-medium">Draft</span>
          )}
        </div>
        {event.location && (
          <p className="text-xs text-muted-foreground truncate">{event.location}</p>
        )}
      </div>
    </Link>
  );
}

const Tickets = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"plans" | "events">("plans");
  const { user } = useAuth();
  const { isOrganiser, activeProfile } = useActiveProfile();
  const { data: profile } = useProfile(user?.id);
  const dividerRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  // New separated hooks
  const { data: plannedEvents = [], isLoading: plansLoading } = useUserPlannedEvents(user?.id);
  const { data: createdEvents = [], isLoading: createdLoading } = useUserCreatedEvents(user?.id);

  const now = useMemo(() => new Date(), []);

  // --- My Plans data ---
  const planTickets: TicketEvent[] = plannedEvents.map((e, i) => ({
    rsvpId: `plan-${e.id}-${i}`,
    eventId: e.id,
    title: e.title,
    eventDate: e.eventDate,
    ticketStatus: (e as any).ticketStatus as TicketStatus,
  }));

  const filteredPlans = planTickets.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pastPlans = filteredPlans
    .filter((t) => t.eventDate && new Date(t.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const upcomingPlans = filteredPlans
    .filter((t) => t.eventDate && new Date(t.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const pastGrouped = groupEvents(pastPlans, PAST_GROUPS, getPastGroup, now);
  const upcomingGrouped = groupEvents(upcomingPlans, UPCOMING_GROUPS, getUpcomingGroup, now);

  // --- My Events data ---
  const filteredCreated = createdEvents.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingCreated = filteredCreated
    .filter((e) => new Date(e.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const pastCreated = filteredCreated
    .filter((e) => new Date(e.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const scrollToDivider = useCallback(() => {
    if (dividerRef.current && !hasScrolled.current && pastPlans.length > 0) {
      hasScrolled.current = true;
      setTimeout(() => {
        dividerRef.current?.scrollIntoView({ block: "start" });
      }, 100);
    }
  }, [pastPlans.length]);

  useEffect(() => {
    if (!plansLoading && plannedEvents) {
      scrollToDivider();
    }
  }, [plansLoading, plannedEvents, scrollToDivider]);

  // Reset scroll flag when switching tabs
  useEffect(() => {
    hasScrolled.current = false;
  }, [activeSection]);

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

  const isLoading = activeSection === "plans" ? plansLoading : createdLoading;
  const allPlans = [...pastPlans, ...upcomingPlans];

  const renderPlansContent = () => {
    if (isLoading) return renderSkeleton();
    if (allPlans.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No plans yet</p>
          <p className="text-sm mt-1">RSVP, buy tickets, or save events to see them here</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {upcomingPlans.length > 0 ? (
          renderGroupedSection(upcomingGrouped, UPCOMING_GROUPS, false)
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No upcoming plans</p>
          </div>
        )}
        {pastPlans.length > 0 && (
          <div ref={dividerRef}>
            <TimeDivider label="Past" prominent />
          </div>
        )}
        {renderGroupedSection(pastGrouped, PAST_GROUPS, true)}
      </div>
    );
  };

  const renderCreatedContent = () => {
    if (createdLoading) return renderSkeleton();
    if (filteredCreated.length === 0) {
      return (
        <div className="text-center py-20 text-muted-foreground">
          <Plus className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No events created yet</p>
          <p className="text-sm mt-1">Events you create will appear here</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {upcomingCreated.length > 0 && (
          <>
            <TimeDivider label="Upcoming" />
            {upcomingCreated.map((e) => (
              <CreatedEventCard key={e.id} event={e} isPast={false} />
            ))}
          </>
        )}
        {pastCreated.length > 0 && (
          <>
            <TimeDivider label="Past" prominent />
            {pastCreated.map((e) => (
              <CreatedEventCard key={e.id} event={e} isPast={true} />
            ))}
          </>
        )}
      </div>
    );
  };

  const renderSkeleton = () => (
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
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile */}
      <div className="md:hidden">
        <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-foreground mb-4 text-center">TICKETS</h1>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-0 h-10"
            />
          </div>
          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "plans" | "events")}>
            <TabsList className="w-full">
              <TabsTrigger value="plans" className="flex-1">My Plans</TabsTrigger>
              <TabsTrigger value="events" className="flex-1">My Events</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <main className="px-4 pt-2">
          {activeSection === "plans" ? renderPlansContent() : renderCreatedContent()}
        </main>
      </div>

      {/* Desktop */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-4xl font-bold text-foreground mb-2 text-center">My Tickets</h1>
          <p className="text-muted-foreground mb-6 text-center">Your events and plans</p>

          <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "plans" | "events")} className="mb-6">
            <TabsList className="w-full max-w-xs mx-auto">
              <TabsTrigger value="plans" className="flex-1">My Plans</TabsTrigger>
              <TabsTrigger value="events" className="flex-1">My Events</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          {activeSection === "plans" ? renderPlansContent() : renderCreatedContent()}
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
