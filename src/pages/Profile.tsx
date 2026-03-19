import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { EventTile } from "@/components/EventTile";
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
  Disc,
  Megaphone,
  Mic2,
  Ticket,
  Home,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useActiveProfile, type OrganiserProfile } from "@/contexts/ActiveProfileContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';
import { useUserFeedWithReposts, useOrganiserPosts } from "@/hooks/usePostsQuery";
import LoadingSpinner from "@/components/LoadingSpinner";

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
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  // ── Personal profile: RSVP-based events (going / attended) ──
  const { data: rsvpEvents } = useQuery({
    queryKey: ["personal-rsvp-events", user?.id],
    queryFn: async () => {
      // Get event IDs the user has RSVP'd to
      const { data: rsvps, error: rsvpErr } = await supabase
        .from("rsvps")
        .select("event_id")
        .eq("user_id", user!.id)
        .eq("status", "going");
      if (rsvpErr) throw rsvpErr;
      if (!rsvps || rsvps.length === 0) return [];

      const eventIds = rsvps.map((r) => r.event_id);
      const now = new Date().toISOString();
      const { data: events, error: evErr } = await supabase
        .from("events")
        .select("id, title, event_date, location, venue_name, cover_image, category")
        .in("id", eventIds)
        .eq("status", "published")
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .order("event_date", { ascending: false });
      if (evErr) throw evErr;
      return (events || []).map((e) => ({
        id: e.id,
        title: e.title,
        eventDate: e.event_date,
        location: e.location,
        venueName: e.venue_name ?? null,
        coverImage: e.cover_image,
        category: e.category,
      }));
    },
    enabled: !!user?.id && !isOrganiser,
  });

  // ── Personal profile: events where user is co-host ──
  const { data: coHostEvents } = useQuery({
    queryKey: ["personal-cohost-events", user?.id],
    queryFn: async () => {
      const { data: cohostRows, error: cohostErr } = await supabase
        .from("event_cohosts")
        .select("event_id")
        .eq("user_id", user!.id);
      if (cohostErr) throw cohostErr;
      if (!cohostRows || cohostRows.length === 0) return [];

      const eventIds = cohostRows.map((r) => r.event_id);
      const now = new Date().toISOString();
      const { data: events, error: evErr } = await supabase
        .from("events")
        .select("id, title, event_date, location, venue_name, cover_image, category")
        .in("id", eventIds)
        .eq("status", "published")
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .order("event_date", { ascending: false });
      if (evErr) throw evErr;
      return (events || []).map((e) => ({
        id: e.id,
        title: e.title,
        eventDate: e.event_date,
        location: e.location,
        venueName: e.venue_name ?? null,
        coverImage: e.cover_image,
        category: e.category,
      }));
    },
    enabled: !!user?.id && !isOrganiser,
  });

  // ── Organiser profile: hosted events ──
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
        venueName: row.venue_name ?? null,
        coverImage: row.cover_image,
        category: row.category,
      }));
    },
    enabled: isOrganiser && !!activeProfile?.id,
  });

  // Personal: RSVP events + co-hosted events, deduped and sorted by date
  const profileEvents = isOrganiser
    ? organiserEvents
    : (() => {
        const rsvp = rsvpEvents || [];
        const cohost = coHostEvents || [];
        const byId = new Map<string, EventItem>();
        for (const e of [...rsvp, ...cohost]) {
          if (!byId.has(e.id)) byId.set(e.id, e);
        }
        return [...byId.values()].sort(
          (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        );
      })();

  const activeOrg: OrganiserProfile | undefined = isOrganiser
    ? organiserProfiles.find((o) => o.id === activeProfile?.id)
    : undefined;

  // Social count
  const { data: socialCount = 0 } = useQuery({
    queryKey: isOrganiser
      ? ["organiser-follower-count", activeOrg?.id]
      : ["friend-count", user?.id],
    queryFn: async () => {
      if (isOrganiser && activeOrg) {
        const { data } = await supabase.rpc("get_organiser_follower_count", {
          p_organiser_profile_id: activeOrg.id,
        });
        return data || 0;
      }
      // Friends only (not following count)
      const { data } = await supabase.rpc("get_friend_count", { p_user_id: user!.id });
      return data || 0;
    },
    enabled: !!user,
  });

  // Event count
  const { data: eventsCount = 0 } = useQuery({
    queryKey: isOrganiser
      ? ["organiser-past-events", activeOrg?.id]
      : ["personal-combined-events", user?.id],
    queryFn: async () => {
      if (isOrganiser && activeOrg) {
        const { data } = await supabase.rpc("get_organiser_past_event_count", {
          p_organiser_profile_id: activeOrg.id,
        });
        return data || 0;
      }
      const { data } = await supabase.rpc("get_personal_combined_event_count", {
        p_user_id: user!.id,
      });
      return data || 0;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const displayName = isOrganiser && activeOrg ? activeOrg.displayName : profile?.displayName || "";
  const avatarUrl = isOrganiser && activeOrg ? activeOrg.avatarUrl || "" : profile?.avatarUrl || "";
  // Prefer profile.username for @ handle; avoid phone/email fallback until profile has loaded or explicitly failed
  const username = isOrganiser && activeOrg
    ? activeOrg.username
    : profile?.username || profile?.displayName || displayName || (!profileLoading ? (user.phone || user.email?.split("@")[0] || "User") : "…");
  const bio = isOrganiser && activeOrg ? activeOrg.bio || "" : profile?.bio || "";
  const city = isOrganiser && activeOrg ? activeOrg.city || "" : profile?.city || "";
  const classification = isOrganiser && activeOrg ? activeOrg.category : profile?.pageClassification || null;
  

  const now = new Date();
  const upcomingEvents = (profileEvents || [])
    .filter((e) => new Date(e.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const pastEvents = (profileEvents || [])
    .filter((e) => new Date(e.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="absolute top-4 right-4 z-10">
        <Link to="/settings">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary">
            <Settings className="h-5 w-5 text-foreground" />
          </Button>
        </Link>
      </div>

      <main className="px-4 pt-8 max-w-lg mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <button
              onClick={() => setQrOpen(true)}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <Avatar className="border-2 border-border" style={{ width: 120, height: 120 }}>
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-3xl bg-card text-foreground font-bold">
                  {(username[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <h2 className="text-2xl font-black tracking-[0.05em] text-foreground uppercase font-display" style={{ fontStretch: "expanded" }}>
              {displayName || username}
            </h2>
            {(isOrganiser || profile?.isVerified) && (
              <BadgeCheck className="h-5 w-5 text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
            )}
          </div>

          <p className="text-muted-foreground mb-3 tracking-[0.1em] mt-0.5 text-base">
            @{isOrganiser && activeOrg ? activeOrg.username : (profile?.username ?? username.toLowerCase().replace(/\s+/g, ""))}
          </p>

          <div className="flex items-center justify-center gap-6 mb-3">
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

          <div className="flex items-center justify-center gap-2 mb-3">
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
            <p className="text-foreground text-sm leading-relaxed max-w-[300px] mx-auto mb-2">{bio}</p>
          )}

          {(classification || city) && (
            <Badge variant="primaryMd" className="mb-3 mx-auto">
              {classification && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium tracking-wide">
                  <span>{classification}</span>
                  {classification.toLowerCase() === "dj" && (
                    <Disc className="h-3.5 w-3.5" />
                  )}
                  {classification.toLowerCase() === "promoter" && (
                    <Megaphone className="h-3.5 w-3.5" />
                  )}
                  {classification.toLowerCase() === "artist" && (
                    <Mic2 className="h-3.5 w-3.5" />
                  )}
                  {classification.toLowerCase() === "event" && (
                    <Ticket className="h-3.5 w-3.5" />
                  )}
                  {classification.toLowerCase() === "venue" && (
                    <Home className="h-3.5 w-3.5" />
                  )}
                </span>
              )}
              {classification && city && (
                <span className="text-sm font-medium tracking-wide opacity-80">·</span>
              )}
              {city && (
                <span className="inline-flex items-center gap-1 text-sm font-medium tracking-wide">
                  <span>{city}</span>
                  <MapPin className="h-3.5 w-3.5" />
                </span>
              )}
            </Badge>
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
                {isOrganiser && (
                  <Link to="/create">
                    <Button variant="outline" className="mt-4">Create Event</Button>
                  </Link>
                )}
              </div>
            ) : (
              upcomingEvents.map((event) => <EventListItem key={event.id} event={event} />)
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
              pastEvents.map((event) => <EventListItem key={event.id} event={event} />)
            )}
          </TabsContent>
        </Tabs>
      </main>

      <ProfileQrModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        displayName={displayName}
        username={isOrganiser && activeOrg ? activeOrg.username : profile?.username || username.toLowerCase().replace(/\s+/g, "")}
        avatarUrl={avatarUrl || undefined}
        profileUrl={`${window.location.origin}/user/${user.id}`}
      />

      <BottomNav />
    </div>
  );
};

const ProfileFeedTab = ({ userId, isOrganiser, organiserProfileId }: { userId: string; isOrganiser: boolean; organiserProfileId?: string }) => {
  const { data: userPosts = [], isLoading: userLoading } = useUserFeedWithReposts(isOrganiser ? undefined : userId);
  const { data: orgPosts = [], isLoading: orgLoading } = useOrganiserPosts(isOrganiser ? organiserProfileId : undefined);
  const posts = isOrganiser ? orgPosts : userPosts;
  const isLoading = isOrganiser ? orgLoading : userLoading;

  if (isLoading) return <LoadingSpinner message="Loading posts..." />;
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No feed activity yet</p>
      </div>
    );
  }

  return (
    <div className="-mx-4">
      {posts.map((post, idx) => (
        <FeedPost
          key={post.reposted_by_name ? `repost-${post.id}-${idx}` : post.id}
          postId={post.id}
          authorId={post.author_id}
          organiserProfileId={post.organiser_profile_id}
          displayName={post.author_display_name || "User"}
          username={post.author_username || "user"}
          avatarUrl={post.author_avatar_url}
          content={post.content}
          createdAt={post.created_at}
          imageUrl={post.image_url}
          gifUrl={post.gif_url}
          repostedBy={post.reposted_by_name}
          isVerified={post.author_is_verified}
          eventData={post.event_data}
          collaborators={post.collaborators}
        />
      ))}
    </div>
  );
};

const EventListItem = ({ event }: { event: { id: string; title: string; eventDate: string; location: string | null; venueName?: string | null; coverImage: string | null; category: string | null } }) => (
  <EventTile
    event={event}
    trailing={<ChevronRight className="h-5 w-5 text-muted-foreground pl-2 pr-3 flex-shrink-0" />}
  />
);

export default Profile;
