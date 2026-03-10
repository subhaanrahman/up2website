import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useSearchEvents } from "@/hooks/useEventsQuery";
import { useForYouEvents } from "@/hooks/useForYouEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { EventFilter } from "@/features/events";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";

interface SearchResult {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  type: "user" | "organiser";
}

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
  { value: "tonight", label: "🌙 Tonight" },
  { value: "thisWeek", label: "📅 This Week" },
  { value: "thisMonth", label: "🗓️ This Month" },
  { value: "free", label: "🎟️ Free" },
];

const Events = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<EventFilter | "">("");
  const [peopleResults, setPeopleResults] = useState<SearchResult[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: savedEventIds = new Set<string>() } = useQuery({
    queryKey: ["saved-event-ids", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", user.id);
      return new Set((data || []).map(d => d.event_id));
    },
    enabled: !!user,
  });

  const handleToggleSave = useCallback(async (eventId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || savingId) return;
    setSavingId(eventId);
    try {
      if (savedEventIds.has(eventId)) {
        await supabase.from("saved_events").delete().eq("event_id", eventId).eq("user_id", user.id);
        toast({ title: "Removed from saved" });
      } else {
        await supabase.from("saved_events").insert({ user_id: user.id, event_id: eventId });
        toast({ title: "Saved!" });
      }
      queryClient.invalidateQueries({ queryKey: ["saved-event-ids", user.id] });
      queryClient.invalidateQueries({ queryKey: ["saved-event", eventId, user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-tickets"] });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }, [user, savingId, savedEventIds, queryClient, toast]);

  const { data: eventResults = [], isLoading: eventsLoading } = useSearchEvents({
    query: searchQuery,
    filter: selectedFilter || undefined,
    city: (!searchQuery.trim() && !selectedFilter && profile?.city) ? profile.city : undefined,
    limit: 30,
  });

  const { data: forYouEvents = [], isLoading: forYouLoading } = useForYouEvents(15);

  const isSearching = !!searchQuery.trim();
  const showForYou = !isSearching && !selectedFilter;
  const displayEvents = showForYou ? forYouEvents : eventResults;
  const displayEventsLoading = showForYou ? forYouLoading : eventsLoading;

  // Search people when query changes
  useEffect(() => {
    if (!searchQuery.trim()) { setPeopleResults([]); return; }
    const timer = setTimeout(async () => {
      setPeopleLoading(true);
      const q = `%${searchQuery.trim()}%`;
      const [profilesRes, organisersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").or(`display_name.ilike.${q},username.ilike.${q}`).limit(5),
        supabase.from("organiser_profiles").select("id, display_name, username, avatar_url").or(`display_name.ilike.${q},username.ilike.${q}`).limit(5),
      ]);
      setPeopleResults([...mapOrganisers(organisersRes.data || []), ...mapProfiles(profilesRes.data || [])]);
      setPeopleLoading(false);
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

  const renderEventItem = (event: any) => (
    <Link key={event.id} to={`/events/${event.id}`} className="flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors">
      <div className="w-28 h-28 flex-shrink-0">
        {event.coverImage || event.cover_image ? (
          <img src={event.coverImage || event.cover_image} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <img src={getEventFlyer(event.id)} alt={event.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 px-4 py-3 min-w-0">
        <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-3 capitalize leading-tight">{event.title}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-primary/15 px-3 py-2 rounded-full text-primary-foreground font-medium h-7 flex items-center border border-primary/30">
            {format(new Date(event.eventDate || event.event_date), "EEE M/d - ha")}
          </span>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
    </Link>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile */}
      <div className="md:hidden">
        <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-2">
          <h1 className="text-2xl font-bold text-foreground mb-4 text-center">SEARCH</h1>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search events & people" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary border-0 h-10" />
          </div>
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
            {timeFilters.map(f => (
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

          {/* Section label */}
          {isSearching && <p className="text-sm font-semibold text-muted-foreground mb-2">Events</p>}
          {showForYou && <p className="text-sm font-semibold text-muted-foreground mb-2">For You</p>}

          {displayEventsLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 py-3">
                  <div className="h-16 w-16 rounded-lg bg-secondary animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-secondary rounded animate-pulse" />
                    <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No upcoming events found</p>
          ) : (
            <div className="space-y-3 pt-1">{displayEvents.map(renderEventItem)}</div>
          )}
        </main>
      </div>

      {/* Desktop */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">Search</h1>
          <p className="text-muted-foreground mb-6">Find events and people</p>

          <div className="max-w-2xl">
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events & people..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {/* People results when searching */}
            {isSearching && peopleResults.length > 0 && (
              <div className="mb-6 max-w-md">
                <p className="text-sm font-semibold text-muted-foreground mb-2">People</p>
                <div className="space-y-0">{peopleResults.map((r, i) => renderProfileItem(r, i))}</div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap mb-4">
              {timeFilters.map(f => (
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

            {isSearching && <p className="text-sm font-semibold text-muted-foreground mb-3">Events</p>}
            {showForYou && <p className="text-sm font-semibold text-muted-foreground mb-3">For You</p>}

            {displayEventsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : displayEvents.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center">No upcoming events found</p>
            ) : (
              <div className="space-y-3 max-w-lg">{displayEvents.map(renderEventItem)}</div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
