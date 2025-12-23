import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Instagram,
  Send,
  MapPin,
  Calendar,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  cover_image: string | null;
  category: string | null;
}

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [followersCount] = useState(321);
  const [eventsCount, setEventsCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchEvents();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || "");
    }
  };

  const fetchEvents = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("events")
      .select("id, title, event_date, location, cover_image, category")
      .eq("host_id", user.id)
      .order("event_date", { ascending: true });

    if (data) {
      setMyEvents(data);
      setEventsCount(data.length);
    }
  };

  const upcomingEvents = myEvents.filter(
    (e) => new Date(e.event_date) >= new Date()
  );
  const pastEvents = myEvents.filter(
    (e) => new Date(e.event_date) < new Date()
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const username = displayName || user.phone || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        {/* Profile Section */}
        <div className="text-center mb-8">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                {username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Username with verified badge */}
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-xl font-bold text-foreground">{username}</h2>
            <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
          </div>

          {/* Handle */}
          <p className="text-muted-foreground text-sm mb-4">
            @{username.toLowerCase().replace(/\s+/g, "")}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{followersCount}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{eventsCount}</p>
              <p className="text-sm text-muted-foreground">Events</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Link to="/dashboard">
              <Button className="px-6">EDIT</Button>
            </Link>
            <Button variant="outline" size="icon" className="rounded-full">
              <Instagram className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full">
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {/* Bio */}
          <p className="text-foreground text-sm max-w-xs mx-auto mb-2">
            Join us for an unforgettable nightlife experience. We host the hottest events in town, with a vibrant atmosphere
          </p>

          {/* Location */}
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
            <MapPin className="h-4 w-4" />
            <span>Venue • Sydney</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="upcoming" className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              UPCOMING
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              FEED
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              PAST
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events</p>
                <Link to="/create">
                  <Button variant="outline" className="mt-4">
                    Create Event
                  </Button>
                </Link>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))
            )}
          </TabsContent>

          <TabsContent value="feed" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <p>No feed activity yet</p>
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {pastEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No past events</p>
              </div>
            ) : (
              pastEvents.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

// Event List Item Component matching Figma design
const EventListItem = ({ event }: { event: Event }) => {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center gap-4 p-3 bg-card rounded-xl border border-border hover:bg-secondary/50 transition-colors"
    >
      {/* Event Image */}
      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{event.location || "Venue"}</p>
        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
        <p className="text-sm text-muted-foreground">
          {format(new Date(event.event_date), "EEE, MMM d")} • {format(new Date(event.event_date), "h:mm a")}
        </p>
        {event.category && (
          <p className="text-sm text-primary">From $49.99</p>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </Link>
  );
};

export default Profile;
