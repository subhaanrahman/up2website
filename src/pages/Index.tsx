import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Plus, Heart, Repeat2, MoreHorizontal, BadgeCheck } from "lucide-react";
import PostComposer from "@/components/PostComposer";
import BottomNav from "@/components/BottomNav";
import { events } from "@/data/events";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";

interface ProfileResult {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const Index = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();
  const nearbyEvents = events.slice(0, 2);

  const [suggestedProfiles, setSuggestedProfiles] = useState<ProfileResult[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .order("created_at", { ascending: false })
        .limit(6);
      // Filter out current user
      if (data) {
        setSuggestedProfiles(
          user ? data.filter((p) => p.user_id !== user.id) : data
        );
      }
    };
    load();
  }, [user]);

  const activeOrg = isOrganiser
    ? organiserProfiles.find((o) => o.id === activeProfile?.id)
    : undefined;

  const displayName = isOrganiser && activeOrg ? activeOrg.displayName : (profile?.displayName || user?.email?.split("@")[0] || "Guest");
  const username = isOrganiser && activeOrg ? activeOrg.username : (profile?.username || displayName.toLowerCase().replace(/\s+/g, ""));
  const avatarUrl = isOrganiser && activeOrg ? (activeOrg.avatarUrl || "") : (profile?.avatarUrl || "");

  // Use the first two real profiles for feed posts, fallback to placeholder
  const feedProfile1 = suggestedProfiles[0];
  const feedProfile2 = suggestedProfiles[1];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-center px-4 h-14 relative">
          <img src={logoImg} alt="Up2" className="h-8 w-auto" />
          <div className="absolute right-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary">
              <Bell className="h-5 w-5 text-foreground" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Post Composer */}
        <PostComposer
          displayName={displayName}
          username={username}
          avatarUrl={avatarUrl}
        />

        {/* Events Near You */}
        <div className="border-b border-border">
          <div className="px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Events Near You</h2>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-2">
            {nearbyEvents.map(event => (
              <Link key={event.id} to={`/events/${event.id}`} className="flex rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors">
                <div className="w-24 h-20 flex-shrink-0 overflow-hidden bg-muted">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 px-3 py-2 flex flex-col justify-center min-w-0">
                  <p className="text-xs text-muted-foreground">{event.location?.split(",")[0] || "Venue"}</p>
                  <h3 className="font-semibold text-foreground text-sm truncate">{event.title}</h3>
                  <p className="text-xs text-muted-foreground">{event.date} - {event.time}</p>
                  <p className="text-xs text-muted-foreground">From $49.99</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Social Feed - Text Post */}
        {feedProfile1 && (
          <div className="px-4 py-4 border-b border-border">
            <div className="flex gap-3">
              <Link to={`/user/${feedProfile1.user_id}`}>
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={feedProfile1.avatar_url || ""} />
                  <AvatarFallback className="bg-card text-foreground font-bold">
                    {(feedProfile1.display_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link to={`/user/${feedProfile1.user_id}`} className="font-bold text-foreground hover:underline">
                      {feedProfile1.display_name || feedProfile1.username || "User"}
                    </Link>
                    <span className="text-muted-foreground text-sm">
                      @{feedProfile1.username || "user"} • 36m
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <p className="text-foreground mt-1 leading-relaxed">
                  If you're reading this, you still have time to pull up 🔥 The party everyone's talking about goes down TONIGHT... don't be the one hearing about it tomorrow 👀
                </p>
                <div className="flex items-center gap-6 mt-3">
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">142</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Repeat2 className="h-4 w-4" />
                    <span className="text-sm">32</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Post */}
        {feedProfile2 && (
          <div className="px-4 py-4 border-b border-border">
            <div className="flex gap-3">
              <Link to={`/user/${feedProfile2.user_id}`}>
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={feedProfile2.avatar_url || ""} />
                  <AvatarFallback className="bg-card text-foreground font-bold">
                    {(feedProfile2.display_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link to={`/user/${feedProfile2.user_id}`} className="font-bold text-foreground hover:underline">
                      {feedProfile2.display_name || feedProfile2.username || "User"}
                    </Link>
                    <BadgeCheck className="h-4 w-4 text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
                    <span className="text-muted-foreground text-sm">posted an event</span>
                    <span className="text-muted-foreground text-sm">• 7 hrs</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                {events[0] && (
                  <Link to={`/events/${events[0].id}`} className="mt-3 flex rounded-xl overflow-hidden bg-card border border-border">
                    <div className="w-24 flex-shrink-0 overflow-hidden bg-muted">
                      <img src={events[0].image} alt={events[0].title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 px-3 py-2 flex flex-col justify-center min-w-0">
                      <p className="text-xs text-muted-foreground">{events[0].location?.split(",")[0] || "Venue"}</p>
                      <h3 className="font-semibold text-foreground text-sm">{events[0].title}</h3>
                      <p className="text-xs text-muted-foreground">{events[0].date} - {events[0].time}</p>
                      <p className="text-xs text-muted-foreground">From $49.99</p>
                    </div>
                  </Link>
                )}
                <div className="flex items-center gap-6 mt-3">
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">142</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Repeat2 className="h-4 w-4" />
                    <span className="text-sm">32</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Friends - Real Profiles */}
        {suggestedProfiles.length > 0 && (
          <div className="py-4 border-b border-border">
            <div className="px-4 pb-3">
              <h2 className="text-base font-semibold text-foreground">Suggested Friends</h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 px-4 pb-2">
                {suggestedProfiles.map(friend => (
                  <div key={friend.user_id} className="flex-shrink-0 w-32 rounded-2xl bg-card border border-border p-4 flex flex-col items-center">
                    <Link to={`/user/${friend.user_id}`}>
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={friend.avatar_url || ""} />
                        <AvatarFallback className="bg-muted text-foreground font-bold text-lg">
                          {(friend.display_name || friend.username || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <Link to={`/user/${friend.user_id}`} className="font-semibold text-foreground text-sm text-center truncate w-full hover:underline">
                      {friend.display_name || friend.username || "User"}
                    </Link>
                    <span className="text-xs text-muted-foreground truncate w-full text-center">
                      @{friend.username || "user"}
                    </span>
                    <Button variant="secondary" size="sm" className="mt-3 w-full rounded-full text-xs">
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 z-40 w-full md:max-w-[430px] md:left-1/2 md:-translate-x-1/2 left-0 pointer-events-none">
        <div className="flex justify-end px-4 pointer-events-auto w-fit ml-auto">
          <Link to="/create" className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
            <Plus className="h-7 w-7 text-primary-foreground" />
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
