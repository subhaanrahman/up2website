import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Instagram,
  Send,
  MapPin,
  Calendar,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Mock profiles for demo/search results that use non-UUID IDs
const mockProfiles: Record<string, any> = {
  "1": {
    display_name: "DYLAN",
    username: "dylan",
    avatar_url: "",
    bio: "Music lover & event enthusiast 🎶",
    page_classification: "Personal",
    city: "Sydney",
  },
  "2": {
    display_name: "NOIR",
    username: "noir",
    avatar_url: "",
    bio: "Nightlife curator. Follow for the best events in town 🌙",
    page_classification: "Venue",
    city: "Melbourne",
  },
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // Check if it's a mock/demo ID first
    const mockProfile = mockProfiles[userId];
    if (mockProfile) {
      setProfile(mockProfile);
      setEvents([]);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("host_id", userId)
        .eq("is_public", true)
        .order("event_date", { ascending: false });

      setProfile(profileData);
      setEvents(eventsData || []);
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const displayName = profile?.display_name || profile?.username || "User";
  const username = profile?.username || displayName.toLowerCase().replace(/\s+/g, "");
  const avatarUrl = profile?.avatar_url;

  const upcomingEvents = events.filter((e) => new Date(e.event_date) >= new Date());
  const pastEvents = events.filter((e) => new Date(e.event_date) < new Date());

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>
        <div className="px-4 pt-4 max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-28 w-28 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-6">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground">Profile</span>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
          <p className="text-muted-foreground">User not found</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-foreground">{displayName}</span>
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto">
        {/* Profile Section */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-28 w-28">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-card text-foreground font-semibold text-2xl">
                {displayName[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <h2 className="text-xl font-bold tracking-wide text-foreground uppercase">
              {displayName}
            </h2>
            <BadgeCheck className="h-5 w-5 text-primary fill-primary" />
          </div>

          <p className="text-muted-foreground text-sm mb-4">@{username}</p>

          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">—</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{events.length}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-5">
            <Button className="px-8 h-11 rounded-full font-semibold">FOLLOW</Button>
            <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
              <Instagram className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {profile.bio && (
            <p className="text-foreground text-sm leading-relaxed max-w-[300px] mx-auto mb-3">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-6">
            <MapPin className="h-4 w-4" />
            <span>{profile.page_classification || "User"} • {profile.city || "—"}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full h-auto p-0 bg-transparent border-b border-border rounded-none">
            <TabsTrigger
              value="upcoming"
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              UPCOMING
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              PAST
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-3 p-2 bg-card rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {event.cover_image ? (
                      <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-semibold text-foreground truncate mb-0.5">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), "EEE, MMM d · h:mm a")}
                    </p>
                    <p className="text-sm text-muted-foreground">{event.location || ""}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {pastEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No past events</p>
              </div>
            ) : (
              pastEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-3 p-2 bg-card rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {event.cover_image ? (
                      <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-semibold text-foreground truncate mb-0.5">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), "EEE, MMM d · h:mm a")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default UserProfile;
