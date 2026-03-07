import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import OrganiserDashboard from "@/components/OrganiserDashboard";
import { getEventFlyer } from "@/lib/eventFlyerUtils";

const Tickets = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { isOrganiser } = useActiveProfile();
  const dividerRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  const { data: rsvpEvents, isLoading } = useQuery({
    queryKey: ["user-rsvps", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("rsvps")
        .select(`
          id,
          status,
          event_id,
          events (
            id,
            title,
            event_date,
            cover_image,
            location
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["going", "interested"]);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const now = new Date();

  // Past events: most recent first (reverse chronological)
  const pastEvents = rsvpEvents
    ?.filter((rsvp) =>
      rsvp.events?.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      rsvp.events?.event_date && new Date(rsvp.events.event_date) < now
    )
    .sort((a, b) => {
      const dateA = new Date(a.events!.event_date);
      const dateB = new Date(b.events!.event_date);
      return dateB.getTime() - dateA.getTime();
    }) || [];

  // Upcoming events: soonest first
  const upcomingEvents = rsvpEvents
    ?.filter((rsvp) =>
      rsvp.events?.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      rsvp.events?.event_date && new Date(rsvp.events.event_date) >= now
    )
    .sort((a, b) => {
      const dateA = new Date(a.events!.event_date);
      const dateB = new Date(b.events!.event_date);
      return dateA.getTime() - dateB.getTime();
    }) || [];

  // Auto-scroll to the divider (today) on first load
  const scrollToDivider = useCallback(() => {
    if (dividerRef.current && !hasScrolled.current && pastEvents.length > 0) {
      hasScrolled.current = true;
      // Small delay to ensure layout is complete
      setTimeout(() => {
        dividerRef.current?.scrollIntoView({ block: "start" });
      }, 100);
    }
  }, [pastEvents.length]);

  useEffect(() => {
    if (!isLoading && rsvpEvents) {
      scrollToDivider();
    }
  }, [isLoading, rsvpEvents, scrollToDivider]);

  const allEvents = [...pastEvents, ...upcomingEvents];

  const renderEventCard = (rsvp: typeof allEvents[0]) => {
    const isPast = rsvp.events?.event_date && new Date(rsvp.events.event_date) < now;
    return (
      <Link
        key={rsvp.id}
        to={`/events/${rsvp.event_id}`}
        className={`flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors ${isPast ? "opacity-60" : ""}`}
      >
        <div className="w-28 h-28 flex-shrink-0">
          <img
            src={getEventFlyer(rsvp.event_id)}
            alt={rsvp.events?.title}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 px-4 py-3 min-w-0">
          <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-3 capitalize leading-tight">
            {rsvp.events?.title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
              {rsvp.events?.event_date
                ? format(new Date(rsvp.events.event_date), "EEE M/d - ha")
                : "TBD"}
            </span>
            <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
              {isPast ? "Past" : "Upcoming"}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
      </Link>
    );
  };

  if (isOrganiser) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <OrganiserDashboard />
        <BottomNav />
      </div>
    );
  }

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
              {/* Past events (scroll up to see) */}
              {pastEvents.map((rsvp) => renderEventCard(rsvp))}

              {/* Today divider - page loads here */}
              {pastEvents.length > 0 && (
                <div ref={dividerRef} className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Upcoming events (visible on load) */}
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((rsvp) => renderEventCard(rsvp))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No tickets yet</p>
              <p className="text-sm mt-1">RSVP to events to see them here</p>
            </div>
          )}
        </main>
      </div>

      {/* Desktop View */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-2 text-center">My Tickets</h1>
          <p className="text-muted-foreground mb-8">Events you've RSVP'd to</p>

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
              {[...upcomingEvents, ...pastEvents].map((rsvp) => (
                <Link
                  key={rsvp.id}
                  to={`/events/${rsvp.event_id}`}
                  className={`bg-card rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all ${
                    rsvp.events?.event_date && new Date(rsvp.events.event_date) < now ? "opacity-60" : ""
                  }`}
                >
                   <img
                    src={getEventFlyer(rsvp.event_id)}
                    alt={rsvp.events?.title}
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-2 capitalize">
                      {rsvp.events?.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {rsvp.events?.event_date
                        ? format(new Date(rsvp.events.event_date), "EEE M/d • h:mma")
                        : "TBD"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>No tickets yet</p>
              <p className="text-sm mt-1">RSVP to events to see them here</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Tickets;
