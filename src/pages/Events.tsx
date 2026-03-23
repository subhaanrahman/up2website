import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EventTile } from "@/components/EventTile";
import { Search, ChevronRight, Bookmark, Check, Send, Map, List, X, Users, DollarSign, Mail } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { eventsRepository } from "@/features/events/repositories/eventsRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import { connectionsRepository } from "@/features/social/repositories/connectionsRepository";
import { useSearchEvents } from "@/hooks/useEventsQuery";
import { useForYouEvents } from "@/hooks/useForYouEvents";
import { useNearbyEvents } from "@/hooks/useFeedQuery";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import type { EventFilter, EventEntity } from "@/features/events";
import { trackInteraction } from "@/lib/interactionAnalytics";
import { getEventPricePillLabel, eventHasPaidTickets } from "@/lib/utils";
import { prefetchEventDetail } from "@/lib/prefetch";
import { TileSkeleton } from "@/components/ui/skeletons";

interface SearchResult {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  type: "user" | "organiser";
}

const RECENT_SEARCHES_KEY = "recent_event_searches_v1";

function mapProfiles(rows: any[]): SearchResult[] {
  return rows.map((r) => ({
    id: r.user_id,
    displayName: r.display_name,
    username: r.username,
    avatarUrl: r.avatar_url,
    type: "user" as const,
  }));
}

function mapOrganisers(rows: any[]): SearchResult[] {
  return rows.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    username: r.username,
    avatarUrl: r.avatar_url,
    type: "organiser" as const,
  }));
}

const timeFilters = [
  { value: "", label: "All" },
  { value: "tonight", label: "Tonight" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "free", label: "Free" },
];

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string").slice(0, 8);
  } catch {
    return [];
  }
}

function normalizeEvent(raw: any): EventEntity {
  return {
    id: raw.id,
    hostId: raw.hostId ?? raw.host_id ?? "",
    title: raw.title,
    description: raw.description ?? null,
    location: raw.location ?? null,
    venueName: raw.venueName ?? raw.venue_name ?? null,
    address: raw.address ?? null,
    eventDate: raw.eventDate ?? raw.event_date,
    endDate: raw.endDate ?? raw.end_date ?? null,
    coverImage: raw.coverImage ?? raw.cover_image ?? null,
    category: raw.category ?? null,
    maxGuests: raw.maxGuests ?? raw.max_guests ?? null,
    isPublic: raw.isPublic ?? raw.is_public ?? true,
    ticketsAvailableFrom: raw.ticketsAvailableFrom ?? raw.tickets_available_from ?? null,
    ticketsAvailableUntil: raw.ticketsAvailableUntil ?? raw.tickets_available_until ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    ticketPriceCents: raw.ticketPriceCents ?? raw.ticket_price_cents ?? 0,
  };
}

const Events = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<EventFilter | "">("");
  const [peopleResults, setPeopleResults] = useState<SearchResult[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches());
  const peopleSearchSeqRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 220);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const persistRecent = useCallback((value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;
    setRecentSearches((prev) => {
      const next = [cleaned, ...prev.filter((v) => v.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  const { data: savedEventIds = new Set<string>() } = useQuery({
    queryKey: ["saved-event-ids", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      return eventsRepository.getSavedEventIds(user.id);
    },
    enabled: !!user,
  });

  const handleToggleSave = useCallback(async (eventId: string) => {
    if (!user || savingId) return;
    const wasSaved = savedEventIds.has(eventId);
    setSavingId(eventId);
    try {
      if (wasSaved) {
        await eventsRepository.unsaveEvent(user.id, eventId);
        trackInteraction({ action: "unsave_event", eventId, source: "search_tile" });
        queryClient.invalidateQueries({ queryKey: ["saved-event-ids", user.id] });
        toast({
          title: "Removed from saved",
          action: (
            <ToastAction
              altText="Undo"
              onClick={async () => {
                await eventsRepository.saveEvent(user.id, eventId);
                queryClient.invalidateQueries({ queryKey: ["saved-event-ids", user.id] });
              }}
            >
              Undo
            </ToastAction>
          ),
        });
      } else {
        await eventsRepository.saveEvent(user.id, eventId);
        trackInteraction({ action: "save_event", eventId, source: "search_tile" });
        queryClient.invalidateQueries({ queryKey: ["saved-event-ids", user.id] });
        toast({
          title: "Saved",
          action: (
            <ToastAction
              altText="Undo"
              onClick={async () => {
                await eventsRepository.unsaveEvent(user.id, eventId);
                queryClient.invalidateQueries({ queryKey: ["saved-event-ids", user.id] });
              }}
            >
              Undo
            </ToastAction>
          ),
        });
      }
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }, [user, savingId, savedEventIds, queryClient, toast]);

  const handleQuickShare = useCallback(async (event: EventEntity) => {
    const url = `${window.location.origin}/events/${event.id}`;
    const text = `Check out ${event.title}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied" });
      }
    } catch {
      // user canceled share sheet; do nothing
    }
  }, [toast]);

  const { data: eventResults = [], isLoading: eventsLoading } = useSearchEvents({
    query: debouncedQuery,
    filter: selectedFilter || undefined,
    city: (!debouncedQuery.trim() && !selectedFilter && profile?.city) ? profile.city : undefined,
    limit: 30,
    hostUserId: user?.id ?? null,
  });

  const { data: forYouEvents = [], isLoading: forYouLoading } = useForYouEvents(15);
  const { data: nearbyEvents = [] } = useNearbyEvents(8);

  const { data: trendingEvents = [] } = useQuery({
    queryKey: ["trending-events-v1", user?.id ?? "guest"],
    queryFn: async () => eventsRepository.search({ limit: 12, hostUserId: user?.id ?? null }),
  });

  const { data: friendsGoingEvents = [] } = useQuery({
    queryKey: ["friends-going-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const friendIds = await connectionsRepository.getFriendIds(user.id);
      const friendArr = [...friendIds].slice(0, 20);
      if (friendArr.length === 0) return [];
      const eventIds = await eventsRepository.getEventIdsByGoingUserIds(friendArr);
      if (eventIds.length === 0) return [];
      return eventsRepository.getUpcomingEventsByIds(eventIds.slice(0, 15));
    },
    enabled: !!user,
  });

  const nearbyNormalized = useMemo(() => (nearbyEvents || []).map(normalizeEvent), [nearbyEvents]);
  const friendsGoingNormalized = useMemo(() => (friendsGoingEvents || []).map(normalizeEvent), [friendsGoingEvents]);
  const soonEvents = useMemo(() => {
    const base = forYouEvents.length > 0 ? forYouEvents : trendingEvents;
    return base.slice(0, 12).map(normalizeEvent);
  }, [forYouEvents, trendingEvents]);

  const isSearching = !!searchQuery.trim();
  const showDiscoveryLanding = !isSearching && !selectedFilter;
  const displayEvents = showDiscoveryLanding ? forYouEvents : eventResults;
  const displayEventsLoading = showDiscoveryLanding ? forYouLoading : eventsLoading;

  // Search people when query changes
  useEffect(() => {
    if (!searchQuery.trim()) { setPeopleResults([]); return; }
    const timer = setTimeout(async () => {
      const seq = ++peopleSearchSeqRef.current;
      const qRaw = searchQuery.trim();
      const [profilesRes, organisersRes] = await Promise.all([
        profilesRepository.searchProfiles(qRaw, { limit: 5 }),
        profilesRepository.searchOrganisers(qRaw, { limit: 5 }),
      ]);
      if (seq !== peopleSearchSeqRef.current) return;
      setPeopleResults([...mapOrganisers(organisersRes), ...mapProfiles(profilesRes)]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const renderProfileItem = (result: SearchResult, index: number) => (
    <Link key={`${result.type}-${result.id}-${index}`} to={`/user/${result.id}`} className="flex items-center gap-3 py-3 hover:bg-secondary/30 transition-colors -mx-4 px-4">
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={result.avatarUrl || ""} />
        <AvatarFallback className="bg-card text-foreground font-semibold text-sm">
          {(result.displayName || result.username || "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-foreground">{result.displayName || result.username || "User"}</h3>
          {result.type === "organiser" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Organiser</Badge>}
        </div>
        {result.username && <p className="text-sm text-muted-foreground">@{result.username}</p>}
      </div>
    </Link>
  );

  const renderEventItem = (event: EventEntity) => {
    const isSaved = savedEventIds.has(event.id);
    const actionLoading = savingId === event.id;
    const priceCents = event.ticketPriceCents ?? event.ticket_price_cents;
    const hasPaid = eventHasPaidTickets(priceCents);

    return (
      <EventTile
        key={event.id}
        event={event}
        onNavigateIntent={() => prefetchEventDetail(queryClient, event.id)}
        dateRightBadge={
          <Badge variant="primary" className="text-[11px] py-1 px-2 gap-1">
            {hasPaid ? (
              <>
                <DollarSign className="h-3 w-3 shrink-0" />
                {getEventPricePillLabel(priceCents)}
              </>
            ) : (
              <>
                <Mail className="h-3 w-3 shrink-0" />
                {getEventPricePillLabel(priceCents)}
              </>
            )}
          </Badge>
        }
        trailing={<ChevronRight className="h-5 w-5 text-muted-foreground pl-2 pr-3 flex-shrink-0" />}
        secondaryActions={[
          {
            label: isSaved ? "Saved" : "Save",
            ariaLabel: isSaved ? "Saved" : "Save event",
            disabled: actionLoading,
            icon: isSaved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />,
            onClick: () => handleToggleSave(event.id),
          },
          {
            label: "Share",
            ariaLabel: "Share event",
            icon: <Send className="h-3.5 w-3.5" />,
            onClick: () => handleQuickShare(event),
          },
        ]}
      />
    );
  };

  const renderRail = (title: string, events: EventEntity[], icon?: React.ReactNode) => {
    if (events.length === 0) return null;
    return (
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        </div>
        <div className="grid grid-cols-1 gap-3">{events.slice(0, 6).map(renderEventItem)}</div>
      </section>
    );
  };

  const mapQuery = useMemo(() => {
    const first = (soonEvents[0]?.address || soonEvents[0]?.location || profile?.city || "Events near me");
    return encodeURIComponent(first);
  }, [soonEvents, profile?.city]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    persistRecent(searchQuery);
    trackInteraction({ action: "search_submit", source: "events_search", metadata: { q: searchQuery.trim() } });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile */}
      <div className="md:hidden">
        <header className="sticky top-0 z-40 bg-background px-4 pt-5 pb-2 border-b border-border/70">
          <h1 className="text-xl font-bold text-foreground mb-3 text-center tracking-wide">Search</h1>
          <form className="relative mb-2" onSubmit={onSearchSubmit}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events & people"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-0 h-10"
            />
          </form>

          {!searchQuery.trim() && recentSearches.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  onClick={() => setSearchQuery(item)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-xs text-foreground whitespace-nowrap"
                >
                  {item}
                </button>
              ))}
              <button onClick={clearRecent} className="text-xs text-muted-foreground whitespace-nowrap">
                Clear
              </button>
            </div>
          )}
        </header>

        <main className="px-4">
          {/* People results when searching */}
          {isSearching && peopleResults.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-muted-foreground mb-1">People</p>
              <div className="space-y-0">{peopleResults.map((r, i) => renderProfileItem(r, i))}</div>
            </div>
          )}

          {/* Time filters */}
          <div className="flex gap-2 overflow-x-auto py-3 -mx-4 px-4 no-scrollbar">
            {timeFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setSelectedFilter(f.value as EventFilter | "")}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {showDiscoveryLanding && (
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setViewMode("list")}
                className={`h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                  viewMode === "map" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <Map className="h-3.5 w-3.5" />
                Map
              </button>
            </div>
          )}

          {showDiscoveryLanding && viewMode === "map" && (
            <section className="mb-4">
              <div className="rounded-tile-sm overflow-hidden border border-border">
                <iframe
                  title="Event map"
                  src={`https://maps.google.com/maps?q=${mapQuery}&output=embed&z=12`}
                  className="w-full h-56 border-0 dark:[filter:grayscale(100%)_invert(98%)_contrast(95%)]"
                  loading="lazy"
                />
              </div>
            </section>
          )}

          {displayEventsLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <TileSkeleton key={i} />
              ))}
            </div>
          ) : showDiscoveryLanding ? (
            <>
              {renderRail("Near You", nearbyNormalized)}
              {renderRail("Trending", trendingEvents)}
              {renderRail("Friends Going", friendsGoingNormalized, <Users className="h-4 w-4 text-muted-foreground" />)}
              {renderRail("Soon", soonEvents)}
            </>
          ) : displayEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-foreground font-medium">No upcoming events found</p>
              <p className="text-sm text-muted-foreground mt-1">Try another term or reset your filters.</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedFilter("");
                  }}
                  className="h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Reset filters
                </button>
                <Link to="/" className="h-9 px-3 rounded-full bg-secondary text-foreground text-xs font-semibold inline-flex items-center">
                  Back to feed
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-1 grid-auto-rows-[1fr]">{displayEvents.map(renderEventItem)}</div>
          )}
        </main>
      </div>

      {/* Desktop */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">Search</h1>
          <p className="text-muted-foreground mb-6">Find events and people</p>

          <div className="max-w-3xl">
            <form className="relative max-w-md mb-4" onSubmit={onSearchSubmit}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events & people..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </form>

            {!searchQuery.trim() && recentSearches.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {recentSearches.map((item) => (
                  <button key={item} onClick={() => setSearchQuery(item)} className="px-3 py-1.5 rounded-full bg-secondary text-xs text-foreground">
                    {item}
                  </button>
                ))}
                <button onClick={clearRecent} className="text-xs text-muted-foreground">Clear</button>
              </div>
            )}

            {/* People results when searching */}
            {isSearching && peopleResults.length > 0 && (
              <div className="mb-6 max-w-md">
                <p className="text-sm font-semibold text-muted-foreground mb-2">People</p>
                <div className="space-y-0">{peopleResults.map((r, i) => renderProfileItem(r, i))}</div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap mb-4">
              {timeFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setSelectedFilter(f.value as EventFilter | "")}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    selectedFilter === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {displayEventsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <TileSkeleton key={i} />
                ))}
              </div>
            ) : showDiscoveryLanding ? (
              <>
                {renderRail("Near You", nearbyNormalized)}
                {renderRail("Trending", trendingEvents)}
                {renderRail("Friends Going", friendsGoingNormalized, <Users className="h-4 w-4 text-muted-foreground" />)}
                {renderRail("Soon", soonEvents)}
              </>
            ) : displayEvents.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center">No upcoming events found</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-w-lg grid-auto-rows-[1fr]">{displayEvents.map(renderEventItem)}</div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
