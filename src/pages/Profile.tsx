import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProfileQrModal from "@/components/ProfileQrModal";
import FeedPost from "@/components/FeedPost";
import {
  Settings,
  MapPin,
  Calendar,
  ChevronRight,
  BadgeCheck,
  Users,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

import { useProfile } from "@/hooks/useProfileQuery";
import { useHostEvents } from "@/hooks/useEventsQuery";
import { useActiveProfile, type OrganiserProfile } from "@/contexts/ActiveProfileContext";

import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserPosts, useOrganiserPosts } from "@/hooks/usePostsQuery";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getEventFlyer } from "@/lib/eventFlyerUtils";

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
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);

  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();
  const { data: profile } = useProfile(user?.id);
  const { data: hostEvents } = useHostEvents(user?.id);

  // Fetch organiser events when in organiser mode
  const { data: organiserEvents } = useQuery({
    queryKey: ["organiser-profile-events", activeProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("organiser_profile_id", activeProfile!.id)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        eventDate: row.event_date,
        location: row.location,
        coverImage: row.cover_image,
        category: row.category,
      }));
    },
    enabled: isOrganiser && !!activeProfile?.id,
  });

  const profileEvents = isOrganiser ? organiserEvents : hostEvents;

  // If organiser profile is active, find the full data
  const activeOrg: OrganiserProfile | undefined = isOrganiser
    ? organiserProfiles.find((o) => o.id === activeProfile?.id)
    : undefined;

  

  // Social count: Friends/Following for personal, Followers for organiser
  const { data: socialCount = 0 } = useQuery({
    queryKey: isOrganiser
      ? ["organiser-follower-count", activeOrg?.id]
      : ["friends-following-count", user?.id],
    queryFn: async () => {
      if (isOrganiser && activeOrg) {
        const { data, error } = await supabase.rpc("get_organiser_follower_count", { p_organiser_profile_id: activeOrg.id });
        if (error) throw error;
        return data || 0;
      }
      const { data, error } = await supabase.rpc("get_friends_and_following_count", { p_user_id: user!.id });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!user,
  });

  // Event count: past events for organiser, combined for personal
  const { data: eventsCount = 0 } = useQuery({
    queryKey: isOrganiser
      ? ["organiser-past-events", activeOrg?.id]
      : ["personal-combined-events", user?.id],
    queryFn: async () => {
      if (isOrganiser && activeOrg) {
        const { data, error } = await supabase.rpc("get_organiser_past_event_count", { p_organiser_profile_id: activeOrg.id });
        if (error) throw error;
        return data || 0;
      }
      const { data, error } = await supabase.rpc("get_personal_combined_event_count", { p_user_id: user!.id });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!user,
  });

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
  

  const now = new Date();
  const upcomingEvents = (profileEvents || [])
    .filter((e) => new Date(e.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const pastEvents = (profileEvents || [])
    .filter((e) => new Date(e.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

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
              onClick={() => setQrOpen(true)}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <Avatar
                className="border-2 border-border"
                style={{ width: 120, height: 120 }}
              >
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-3xl bg-card text-foreground font-bold">
                  {(username[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <h2 className="text-2xl font-black tracking-[0.05em] text-foreground uppercase font-display" style={{ fontStretch: 'expanded' }}>
              {displayName || username}
            </h2>
            <BadgeCheck className="h-5 w-5 text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
          </div>

          <p className="text-muted-foreground text-sm mb-4 tracking-normal mt-1 font-medium lowercase">
            @{isOrganiser && activeOrg ? activeOrg.username : (profile?.username || username.toLowerCase().replace(/\s+/g, ""))}
          </p>

          <div className="flex items-center justify-center gap-6 mb-5">
            <button
              onClick={() => !isOrganiser && navigate("/profile/friends")}
              className={`text-center ${!isOrganiser ? "cursor-pointer" : ""}`}
            >
              <p className="text-lg font-extrabold text-foreground">{socialCount}</p>
              <p className="text-label text-muted-foreground">{isOrganiser ? "Followers" : "Friends"}</p>
            </button>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-foreground">{eventsCount}</p>
              <p className="text-label text-muted-foreground">Events</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-5">
            <Link to={isOrganiser ? "/profile/edit-organiser" : "/profile/edit"}>
              <Button className="px-8 h-11 rounded-full font-bold tracking-widest text-sm">EDIT</Button>
            </Link>
            {isOrganiser && activeOrg && activeOrg.ownerId === user.id && (
              <Link to="/profile/organiser-team">
                <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full">
                  <Users className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>

          {bio && (
            <p className="text-foreground text-sm leading-relaxed max-w-[300px] mx-auto mb-3">
              {bio}
            </p>
          )}

          {(classification || city) && (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-6 mx-auto">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium tracking-wide text-foreground/80">
                {[classification, city].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full h-auto p-0 bg-transparent border-b border-border rounded-none">
            <TabsTrigger 
              value="upcoming" 
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-bold tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              UPCOMING
            </TabsTrigger>
            <TabsTrigger 
              value="feed" 
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-bold tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              FEED
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-bold tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              PAST
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {!profileEvents ? (
              <LoadingSpinner message="Loading events..." />
            ) : upcomingEvents.length === 0 ? (
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
            <ProfileFeedTab userId={user.id} isOrganiser={isOrganiser} organiserProfileId={activeOrg?.id} />
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {!profileEvents ? (
              <LoadingSpinner message="Loading events..." />
            ) : pastEvents.length === 0 ? (
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

      <ProfileQrModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        displayName={displayName}
        username={isOrganiser && activeOrg ? activeOrg.username : (profile?.username || username.toLowerCase().replace(/\s+/g, ""))}
        avatarUrl={avatarUrl || undefined}
        profileUrl={`${window.location.origin}/user/${user.id}`}
      />
      <BottomNav />
    </div>
  );
};

const ProfileFeedTab = ({ userId, isOrganiser, organiserProfileId }: { userId: string; isOrganiser: boolean; organiserProfileId?: string }) => {
  const { data: userPosts = [], isLoading: userLoading } = useUserPosts(isOrganiser ? undefined : userId);
  const { data: orgPosts = [], isLoading: orgLoading } = useOrganiserPosts(isOrganiser ? organiserProfileId : undefined);
  const posts = isOrganiser ? orgPosts : userPosts;
  const isLoading = isOrganiser ? orgLoading : userLoading;

  if (isLoading) {
    return <LoadingSpinner message="Loading posts..." />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No feed activity yet</p>
      </div>
    );
  }

  return (
    <div className="-mx-4">
      {posts.map((post) => (
        <FeedPost
          postId={post.id}
          key={post.id}
          authorId={post.author_id}
          organiserProfileId={post.organiser_profile_id}
          displayName={post.author_display_name || "User"}
          username={post.author_username || "user"}
          avatarUrl={post.author_avatar_url}
          content={post.content}
          createdAt={post.created_at}
          imageUrl={post.image_url}
          gifUrl={post.gif_url}
          eventData={post.event_data}
          collaborators={post.collaborators}
        />
      ))}
    </div>
  );
};

const EventListItem = ({ event }: { event: EventItem }) => {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors"
    >
      <div className="w-28 h-28 flex-shrink-0">
        <img
          src={getEventFlyer(event.id)}
          alt={event.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 px-4 py-3 min-w-0">
        <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-3 capitalize leading-tight">
          {event.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
            {format(new Date(event.eventDate), "EEE M/d - ha")}
          </span>
          {event.category && (
            <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
              {event.category}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
    </Link>
  );
};

export default Profile;
