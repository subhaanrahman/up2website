import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

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

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Load suggestions on mount from both tables
  useEffect(() => {
    const loadRecent = async () => {
      const [profilesRes, organisersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("organiser_profiles")
          .select("id, display_name, username, avatar_url")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const merged: SearchResult[] = [
        ...mapOrganisers(organisersRes.data || []),
        ...mapProfiles(profilesRes.data || []),
      ];
      setRecentProfiles(merged);
    };
    loadRecent();
  }, []);

  // Search both tables when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${searchQuery.trim()}%`;

      const [profilesRes, organisersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .or(`display_name.ilike.${q},username.ilike.${q}`)
          .limit(20),
        supabase
          .from("organiser_profiles")
          .select("id, display_name, username, avatar_url")
          .or(`display_name.ilike.${q},username.ilike.${q}`)
          .limit(20),
      ]);

      const merged: SearchResult[] = [
        ...mapOrganisers(organisersRes.data || []),
        ...mapProfiles(profilesRes.data || []),
      ];
      setResults(merged);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayList = searchQuery.trim() ? results : recentProfiles;

  const getLink = (result: SearchResult) =>
    result.type === "organiser" ? `/user/${result.id}` : `/user/${result.id}`;

  const renderProfileItem = (result: SearchResult, index: number) => (
    <Link
      key={`${result.type}-${result.id}-${index}`}
      to={getLink(result)}
      className="flex items-center gap-3 py-3 hover:bg-secondary/30 transition-colors -mx-4 px-4"
    >
      <Avatar className="h-14 w-14 flex-shrink-0">
        <AvatarImage src={result.avatarUrl || ""} />
        <AvatarFallback className="bg-card text-foreground font-semibold text-sm">
          {(result.displayName || result.username || "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-foreground">
            {result.displayName || result.username || "User"}
          </h3>
          {result.type === "organiser" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Organiser
            </Badge>
          )}
        </div>
        {result.username && (
          <p className="text-sm text-muted-foreground">@{result.username}</p>
        )}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile Search Page */}
      <div className="md:hidden">
        <header className="sticky top-0 z-40 bg-background px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">SEARCH</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-0 h-10"
            />
          </div>
        </header>

        <main className="px-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            {searchQuery.trim() ? "Results" : "Suggested"}
          </h2>

          <div className="space-y-0">
            {displayList.map((r, i) => renderProfileItem(r, i))}
          </div>

          {loading && (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
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
        </main>
      </div>

      {/* Desktop View */}
      <main className="hidden md:block pt-24 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">Search</h1>
          <p className="text-muted-foreground mb-8">Find people and events</p>

          <div className="relative max-w-md mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-0 max-w-md">
            {displayList.map((r, i) => renderProfileItem(r, i))}
          </div>

          {!loading && !searchQuery.trim() && displayList.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Start typing to search for people and events</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Events;
