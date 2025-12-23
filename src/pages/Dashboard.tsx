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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);

      // Fetch my hosted events
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, event_date, location, cover_image, category")
        .eq("host_id", user.id)
        .order("event_date", { ascending: true });

      setMyEvents(eventsData || []);

      // Fetch my RSVPs
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {profile?.display_name?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Hey, {profile?.display_name || user.email?.split("@")[0]}! 👋
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {myEvents.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Events Hosted</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/50 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {goingEvents.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Attending</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Clock className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">
                    {upcomingEvents.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">0</p>
                  <p className="text-sm text-muted-foreground">Invites Sent</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="hosting" className="space-y-6">
            <TabsList className="bg-card">
              <TabsTrigger value="hosting">My Events</TabsTrigger>
              <TabsTrigger value="attending">Attending</TabsTrigger>
            </TabsList>

            <TabsContent value="hosting" className="space-y-4">
              {loadingData ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading...
                </div>
              ) : myEvents.length === 0 ? (
                <div className="bg-card rounded-xl p-12 text-center border border-dashed border-border">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">
                    No events yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first event and start inviting friends!
                  </p>
                  <Link to="/create">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Event
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myEvents.map((event) => (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-video bg-muted relative">
                        {event.cover_image ? (
                          <img
                            src={event.cover_image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Calendar className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {event.category && (
                          <Badge className="absolute top-3 left-3">
                            {event.category}
                          </Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-card-foreground mb-1">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.event_date), "MMM d, yyyy")}
                        </p>
                        {event.location && (
                          <p className="text-sm text-muted-foreground">
                            {event.location}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="attending" className="space-y-4">
              {loadingData ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading...
                </div>
              ) : rsvps.length === 0 ? (
                <div className="bg-card rounded-xl p-12 text-center border border-dashed border-border">
                  <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">
                    No events yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Browse events and RSVP to see them here!
                  </p>
                  <Link to="/events">
                    <Button variant="outline" className="gap-2">
                      Browse Events
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rsvps.map((rsvp) => (
                    <Link
                      key={rsvp.id}
                      to={`/events/${rsvp.events.id}`}
                      className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-video bg-muted relative">
                        {rsvp.events.cover_image ? (
                          <img
                            src={rsvp.events.cover_image}
                            alt={rsvp.events.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Calendar className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge
                          className="absolute top-3 right-3"
                          variant={rsvp.status === "going" ? "default" : "secondary"}
                        >
                          {rsvp.status === "going" ? "Going" : "Maybe"}
                        </Badge>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-card-foreground mb-1">
                          {rsvp.events.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(rsvp.events.event_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Dashboard;
