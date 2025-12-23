import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar,
  Users,
  Settings,
  Sparkles,
  CalendarCheck,
  Clock,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  cover_image: string | null;
  category: string | null;
}

interface RSVP {
  id: string;
  status: string;
  events: Event;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, event_date, location, cover_image, category")
        .eq("host_id", user.id)
        .order("event_date", { ascending: true });

      setMyEvents(eventsData || []);

      const { data: rsvpsData } = await supabase
        .from("rsvps")
        .select(`
          id,
          status,
          events (
            id,
            title,
            event_date,
            location,
            cover_image,
            category
          )
        `)
        .eq("user_id", user.id);

      setRsvps((rsvpsData as any) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const upcomingEvents = myEvents.filter(
    (e) => new Date(e.event_date) >= new Date()
  );
  const goingEvents = rsvps.filter((r) => r.status === "going");

  const userName = profile?.display_name || user.phone || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <Link to="/profile">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-4 md:pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Profile Card - Mobile */}
          <div className="md:hidden mb-6">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {userName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">Hey, {userName}!</h2>
                  <p className="text-sm text-muted-foreground">Ready to plan?</p>
                </div>
                <Link to="/create">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    New
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {userName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Hey, {userName}! 👋
                </h1>
                <p className="text-muted-foreground">
                  Ready to plan your next event?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/profile">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Link to="/create">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats - Mobile */}
          <div className="grid grid-cols-2 gap-3 mb-6 md:hidden">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-card-foreground">{myEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Hosted</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-card-foreground">{goingEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Attending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats - Desktop */}
          <div className="hidden md:grid grid-cols-4 gap-4 mb-8">
            {[
              { icon: Calendar, value: myEvents.length, label: "Events Hosted", color: "bg-primary/10" },
              { icon: CalendarCheck, value: goingEvents.length, label: "Attending", color: "bg-primary/10" },
              { icon: Clock, value: upcomingEvents.length, label: "Upcoming", color: "bg-secondary" },
              { icon: Users, value: 0, label: "Invites Sent", color: "bg-muted" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="hosting" className="space-y-4">
            <TabsList className="bg-card border border-border w-full md:w-auto">
              <TabsTrigger value="hosting" className="flex-1 md:flex-none">My Events</TabsTrigger>
              <TabsTrigger value="attending" className="flex-1 md:flex-none">Attending</TabsTrigger>
            </TabsList>

            <TabsContent value="hosting" className="space-y-3">
              {loadingData ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : myEvents.length === 0 ? (
                <div className="bg-card rounded-xl p-8 text-center border border-dashed border-border">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">No events yet</h3>
                  <p className="text-muted-foreground mb-4 text-sm">Create your first event!</p>
                  <Link to="/create">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Mobile List */}
                  <div className="md:hidden space-y-3">
                    {myEvents.map((event) => (
                      <EventListCard key={event.id} event={event} />
                    ))}
                  </div>
                  {/* Desktop Grid */}
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myEvents.map((event) => (
                      <EventGridCard key={event.id} event={event} />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="attending" className="space-y-3">
              {loadingData ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : rsvps.length === 0 ? (
                <div className="bg-card rounded-xl p-8 text-center border border-dashed border-border">
                  <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">No events yet</h3>
                  <p className="text-muted-foreground mb-4 text-sm">Browse and RSVP to events!</p>
                  <Link to="/events">
                    <Button variant="outline" className="gap-2">Browse Events</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Mobile List */}
                  <div className="md:hidden space-y-3">
                    {rsvps.map((rsvp) => (
                      <EventListCard key={rsvp.id} event={rsvp.events} badge={rsvp.status} />
                    ))}
                  </div>
                  {/* Desktop Grid */}
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rsvps.map((rsvp) => (
                      <EventGridCard key={rsvp.id} event={rsvp.events} badge={rsvp.status} />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

// Mobile Event List Card
const EventListCard = ({ event, badge }: { event: Event; badge?: string }) => (
  <Link
    to={`/events/${event.id}`}
    className="flex items-center gap-4 p-3 bg-card rounded-xl border border-border"
  >
    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
      {event.cover_image ? (
        <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Calendar className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
      <p className="text-sm text-muted-foreground">
        {format(new Date(event.event_date), "EEE, MMM d • h:mm a")}
      </p>
      {badge && (
        <Badge variant={badge === "going" ? "default" : "secondary"} className="mt-1 text-xs">
          {badge === "going" ? "Going" : "Maybe"}
        </Badge>
      )}
    </div>
    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
  </Link>
);

// Desktop Event Grid Card
const EventGridCard = ({ event, badge }: { event: Event; badge?: string }) => (
  <Link
    to={`/events/${event.id}`}
    className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow"
  >
    <div className="aspect-video bg-muted relative">
      {event.cover_image ? (
        <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      {event.category && <Badge className="absolute top-3 left-3">{event.category}</Badge>}
      {badge && (
        <Badge className="absolute top-3 right-3" variant={badge === "going" ? "default" : "secondary"}>
          {badge === "going" ? "Going" : "Maybe"}
        </Badge>
      )}
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-card-foreground mb-1">{event.title}</h3>
      <p className="text-sm text-muted-foreground">{format(new Date(event.event_date), "MMM d, yyyy")}</p>
      {event.location && <p className="text-sm text-muted-foreground">{event.location}</p>}
    </div>
  </Link>
);

export default Dashboard;
