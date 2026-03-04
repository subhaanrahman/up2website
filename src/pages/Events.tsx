import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, X, BadgeCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";

interface ProfileResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Load some profiles on mount as "recent" / suggestions
  useEffect(() => {
    const loadRecent = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setRecentProfiles(data);
    };
    loadRecent();
  }, []);

  // Search profiles when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${searchQuery.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .or(`display_name.ilike.${q},username.ilike.${q}`)
        .limit(20);
      setResults(data || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayList = searchQuery.trim() ? results : recentProfiles;

  const renderProfileItem = (profile: ProfileResult) => (
    <Link
      key={profile.user_id}
      to={`/user/${profile.user_id}`}
      className="flex items-center gap-3 py-3 hover:bg-secondary/30 transition-colors -mx-4 px-4"
    >
      <Avatar className="h-14 w-14 flex-shrink-0">
        <AvatarImage src={profile.avatar_url || ""} />
        <AvatarFallback className="bg-card text-foreground font-semibold text-sm">
          {(profile.display_name || profile.username || "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="font-semibold text-foreground">
            {profile.display_name || profile.username || "User"}
          </h3>
        </div>
        {profile.username && (
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
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
            {displayList.map(renderProfileItem)}
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
            {displayList.map(renderProfileItem)}
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
