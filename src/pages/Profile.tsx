import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AvatarWithProgress from "@/components/AvatarWithProgress";
import RewardsModal from "@/components/RewardsModal";
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
import { useGamification } from "@/hooks/useGamification";
import { useProfile } from "@/hooks/useProfileQuery";
import { useHostEvents } from "@/hooks/useEventsQuery";
import { useActiveProfile, type OrganiserProfile } from "@/contexts/ActiveProfileContext";
import { getProgressToNextRank } from "@/features/loyalty";
import { format } from "date-fns";

interface EventItem {
  id: string;
  title: string;
  eventDate: string;
  location: string | null;
  coverImage: string | null;
  category: string | null;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { points, rank } = useGamification();
  const navigate = useNavigate();
  const [followersCount] = useState(321);
  const [rewardsOpen, setRewardsOpen] = useState(false);

  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();
  const { data: profile } = useProfile(user?.id);
  const { data: hostEvents } = useHostEvents(user?.id);

  // If organiser profile is active, find the full data
  const activeOrg: OrganiserProfile | undefined = isOrganiser
    ? organiserProfiles.find((o) => o.id === activeProfile?.id)
    : undefined;

  const progress = getProgressToNextRank(points, rank);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const displayName = isOrganiser && activeOrg ? activeOrg.displayName : (profile?.displayName || "");
  const avatarUrl = isOrganiser && activeOrg ? (activeOrg.avatarUrl || "") : (profile?.avatarUrl || "");
  const username = isOrganiser && activeOrg ? activeOrg.username : (displayName || user.phone || user.email?.split("@")[0] || "User");
  const bio = isOrganiser && activeOrg ? (activeOrg.bio || "") : (profile?.bio || "");
  const city = isOrganiser && activeOrg ? (activeOrg.city || "") : (profile?.city || "");
  const classification = isOrganiser && activeOrg ? activeOrg.category : (profile?.pageClassification || null);
  const instagramHandle = isOrganiser && activeOrg ? activeOrg.instagramHandle : profile?.instagramHandle;
  const eventsCount = hostEvents?.length || 0;

  const upcomingEvents = (hostEvents || []).filter(
    (e) => new Date(e.eventDate) >= new Date()
  );
  const pastEvents = (hostEvents || []).filter(
    (e) => new Date(e.eventDate) < new Date()
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Settings Icon - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <Link to="/settings">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary">
            <Settings className="h-5 w-5 text-foreground" />
          </Button>
        </Link>
      </div>

      <main className="px-4 pt-8 max-w-lg mx-auto">
        {/* Profile Section */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setRewardsOpen(true)}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <AvatarWithProgress
                src={avatarUrl || undefined}
                fallback={username[0]?.toUpperCase() || "U"}
                progress={progress}
                size={120}
              />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <h2 className="text-xl font-bold tracking-wide text-foreground uppercase">
              {username}
            </h2>
            <BadgeCheck className="h-5 w-5 text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
          </div>

          <p className="text-muted-foreground text-sm mb-4">
            @{isOrganiser && activeOrg ? activeOrg.username : (profile?.username || username.toLowerCase().replace(/\s+/g, ""))}
          </p>

          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{followersCount}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{eventsCount}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-5">
            <Link to="/profile/edit">
              <Button className="px-8 h-11 rounded-full font-semibold">EDIT</Button>
            </Link>
            {instagramHandle ? (
              <Button
                variant="secondary"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => window.open(`https://instagram.com/${instagramHandle}`, '_blank', 'noopener,noreferrer')}
              >
                <Instagram className="h-5 w-5" />
              </Button>
            ) : (
              <Link to="/profile/edit">
                <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
                  <Instagram className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
              <Send className="h-5 w-5" />
            </Button>
          </div>

          {bio && (
            <p className="text-foreground text-sm leading-relaxed max-w-[300px] mx-auto mb-3">
              {bio}
            </p>
          )}

          {(classification || city) && (
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-6">
              <MapPin className="h-4 w-4" />
              <span>{[classification, city].filter(Boolean).join(" • ")}</span>
            </div>
          )}
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
              value="feed" 
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              FEED
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

      <RewardsModal open={rewardsOpen} onOpenChange={setRewardsOpen} />
      <BottomNav />
    </div>
  );
};

const EventListItem = ({ event }: { event: EventItem }) => {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center gap-3 p-2 bg-card rounded-xl hover:bg-secondary/50 transition-colors"
    >
      <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
        {event.coverImage ? (
          <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <p className="text-sm text-muted-foreground mb-0.5">{event.location || "Venue"}</p>
        <h3 className="font-semibold text-foreground truncate mb-0.5">{event.title}</h3>
        <p className="text-sm text-muted-foreground mb-0.5">
          {format(new Date(event.eventDate), "EEE, MMM d")} - {format(new Date(event.eventDate), "h:mm a")}
        </p>
        <p className="text-sm text-muted-foreground">From $49.99</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </Link>
  );
};

export default Profile;
