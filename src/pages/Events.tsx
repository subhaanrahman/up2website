import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useSearchEvents } from "@/hooks/useEventsQuery";
import { useForYouEvents } from "@/hooks/useForYouEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import type { EventFilter, EventCategory } from "@/features/events";
import { EVENT_CATEGORIES } from "@/features/events";
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

const categoryLabels: Record<string, string> = {
  party: "🎉 Party",
  music: "🎵 Music",
  networking: "🤝 Networking",
  food: "🍕 Food",
  sports: "⚽ Sports",
  arts: "🎨 Arts",
  charity: "💝 Charity",
  festival: "🎪 Festival",
  comedy: "😂 Comedy",
  other: "📌 Other",
};

const Events = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("events");
  const [selectedFilter, setSelectedFilter] = useState<EventFilter | "">("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "">("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: eventResults = [], isLoading: eventsLoading } = useSearchEvents({
    query: searchQuery,
    filter: selectedFilter || undefined,
    category: selectedCategory || undefined,
    city: (!searchQuery.trim() && !selectedFilter && !selectedCategory && profile?.city) ? profile.city : undefined,
    limit: 30,
  });

  const { data: forYouEvents = [], isLoading: forYouLoading } = useForYouEvents(15);

  // Show "For You" when no search/filter active
  const showForYou = !searchQuery.trim() && !selectedFilter && !selectedCategory;
  const displayEvents = showForYou ? forYouEvents : eventResults;
  const displayEventsLoading = showForYou ? forYouLoading : eventsLoading;

  // Load people suggestions on mount
  useEffect(() => {
    const loadRecent = async () => {
      const [profilesRes, organisersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").order("created_at", { ascending: false }).limit(6),
        supabase.from("organiser_profiles").select("id, display_name, username, avatar_url").order("created_at", { ascending: false }).limit(6),
      ]);
      const merged: SearchResult[] = [
        ...mapOrganisers(organisersRes.data || []),
        ...mapProfiles(profilesRes.data || []),
      ];
      setRecentProfiles(merged);
    };
    loadRecent();
  }, []);

  // Search people when query changes
  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== "people") { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${searchQuery.trim()}%`;
      const [profilesRes, organisersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").or(`display_name.ilike.${q},username.ilike.${q}`).limit(20),
        supabase.from("organiser_profiles").select("id, display_name, username, avatar_url").or(`display_name.ilike.${q},username.ilike.${q}`).limit(20),
      ]);
      setResults([...mapOrganisers(organisersRes.data || []), ...mapProfiles(profilesRes.data || [])]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const displayList = activeTab === "people" ? (searchQuery.trim() ? results : recentProfiles) : [];

  const renderProfileItem = (result: SearchResult, index: number) => (
    <Link key={`${result.type}-${result.id}-${index}`} to={`/user/${result.id}`} className="flex items-center gap-3 py-3 hover:bg-secondary/30 transition-colors -mx-4 px-4">
      <Avatar className="h-14 w-14 flex-shrink-0">
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
          <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
            {format(new Date(event.eventDate || event.event_date), "EEE M/d - ha")}
          </span>
          {event.category && (
            <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
              {event.category}
            </span>
          )}
        </div>
      </div>
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
            <Input placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary border-0 h-10" />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
              <TabsTrigger value="people" className="flex-1">People</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <main className="px-4">
          {activeTab === "events" && (
            <>
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

              {/* Category filters */}
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  All Categories
                </button>
                {EVENT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {categoryLabels[cat] || cat}
                  </button>
                ))}
              </div>

              {/* Section label */}
              {showForYou && (
                <p className="text-sm font-semibold text-muted-foreground mb-2">For You</p>
              )}

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
            </>
          )}

          {activeTab === "people" && (
            <>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 mt-3">
                {searchQuery.trim() ? "Results" : "Suggested"}
              </h2>
              <div className="space-y-0">{displayList.map((r, i) => renderProfileItem(r, i))}</div>
              {loading && (
                <div className="space-y-0">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <div className="h-14 w-14 rounded-full bg-secondary animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
                        <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && searchQuery.trim() && displayList.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No results found</p>
              )}
            </>
          )}
        </main>
      </div>

      {/* Desktop */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">Search</h1>
          <p className="text-muted-foreground mb-6">Find people and events</p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-2xl">
            <TabsList className="mb-4">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
            </TabsList>

            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            <TabsContent value="events">
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
              <div className="flex gap-2 flex-wrap mb-6">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  All Categories
                </button>
                {EVENT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {categoryLabels[cat] || cat}
                  </button>
                ))}
              </div>

              {showForYou && <p className="text-sm font-semibold text-muted-foreground mb-3">For You</p>}

              {displayEventsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : displayEvents.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center">No upcoming events found</p>
              ) : (
                <div className="space-y-3 max-w-lg">{displayEvents.map(renderEventItem)}</div>
              )}
            </TabsContent>

            <TabsContent value="people">
              <div className="space-y-0 max-w-md">
                {displayList.map((r, i) => renderProfileItem(r, i))}
              </div>
              {!loading && !searchQuery.trim() && displayList.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start typing to search for people</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
