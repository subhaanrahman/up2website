import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import FeedPost from "@/components/FeedPost";
import { useUserFeedWithReposts, useOrganiserPosts } from "@/hooks/usePostsQuery";
import ShareProfileSheet from "@/components/ShareProfileSheet";
import LoadingSpinner from "@/components/LoadingSpinner";
import MutualFriendsRow from "@/components/MutualFriendsRow";
import FriendOptionsSheet from "@/components/FriendOptionsSheet";
import {
  ArrowLeft,
  Instagram,
  MapPin,
  Calendar,
  ChevronRight,
  BadgeCheck,
  UserPlus,
  Clock,
  Users,
  Bell,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { getEventFlyer } from "@/lib/eventFlyerUtils";

type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "accepted";

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("none");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connectionMuted, setConnectionMuted] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [socialCount, setSocialCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [isFollowingOrganiser, setIsFollowingOrganiser] = useState(false);
  const [organiserMuted, setOrganiserMuted] = useState(false);
  const [targetIsPublic, setTargetIsPublic] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);

      // Try personal profile first
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        // Personal profile: fetch RSVP-based events
        const { data: rsvps } = await supabase
          .from("rsvps")
          .select("event_id")
          .eq("user_id", userId)
          .eq("status", "going");

        let eventsData: any[] = [];
        if (rsvps && rsvps.length > 0) {
          const eventIds = rsvps.map((r) => r.event_id);
          const { data } = await supabase
            .from("events")
            .select("*")
            .in("id", eventIds)
            .eq("is_public", true)
            .order("event_date", { ascending: false });
          eventsData = data || [];
        }

        setProfile(profileData);
        setEvents(eventsData);
        setLoading(false);
        return;
      }

      // Fallback: check organiser_profiles by id
      const { data: orgData } = await supabase
        .from("organiser_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (orgData) {
        setProfile({
          display_name: orgData.display_name,
          username: orgData.username,
          avatar_url: orgData.avatar_url,
          bio: orgData.bio,
          city: orgData.city,
          instagram_handle: orgData.instagram_handle,
          page_classification: orgData.category,
          user_id: orgData.owner_id,
          _isOrganiser: true,
          _tags: Array.isArray(orgData.tags) ? orgData.tags : [],
        });

        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("organiser_profile_id", userId)
          .eq("is_public", true)
          .order("event_date", { ascending: false });

        setEvents(eventsData || []);
      } else {
        setProfile(null);
        setEvents([]);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  // Fetch connection/follow status
  useEffect(() => {
    if (!user || !userId || userId === user.id) return;

    const fetchStatus = async () => {
      if (profile?._isOrganiser) {
        const { data } = await supabase
          .from("organiser_followers")
          .select("id, muted" as any)
          .eq("organiser_profile_id", userId)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsFollowingOrganiser(!!data);
        setOrganiserMuted((data as any)?.muted ?? false);
        return;
      }

      // Check if target is public
      const { data: pubData } = await supabase.rpc("is_profile_public", { p_user_id: userId });
      setTargetIsPublic(pubData ?? true);

      // Check connections
      const { data: connData } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
        )
        .maybeSingle();

      if (!connData) {
        setConnectionStatus("none");
        setConnectionId(null);
      } else if (connData.status === "accepted") {
        setConnectionStatus("accepted");
        setConnectionId(connData.id);
        setConnectionMuted((connData as any).muted ?? false);
      } else if (connData.requester_id === user.id) {
        setConnectionStatus("pending_sent");
        setConnectionId(connData.id);
      } else {
        setConnectionStatus("pending_received");
        setConnectionId(connData.id);
      }
    };

    fetchStatus();
  }, [user, userId, profile]);

  // Fetch social & event counts
  useEffect(() => {
    if (!userId || !profile) return;
    const isOrg = !!profile._isOrganiser;

    const fetchCounts = async () => {
      if (isOrg) {
        const [{ data: followers }, { data: pastEvents }] = await Promise.all([
          supabase.rpc("get_organiser_follower_count", { p_organiser_profile_id: userId }),
          supabase.rpc("get_organiser_past_event_count", { p_organiser_profile_id: userId }),
        ]);
        setSocialCount(followers || 0);
        setEventCount(pastEvents || 0);
      } else {
        const [{ data: friendCount }, { data: combinedEvents }] = await Promise.all([
          supabase.rpc("get_friend_count", { p_user_id: userId }),
          supabase.rpc("get_personal_combined_event_count", { p_user_id: userId }),
        ]);
        setSocialCount(friendCount || 0);
        setEventCount(combinedEvents || 0);
      }
    };
    fetchCounts();
  }, [userId, profile]);

  // ── Action handlers ──

  const handleFollowOrganiser = async () => {
    if (!user || !userId) return;
    setConnectionLoading(true);
    const { error } = await supabase.from("organiser_followers").insert({
      organiser_profile_id: userId,
      user_id: user.id,
    });
    if (!error) {
      setIsFollowingOrganiser(true);
      setSocialCount((c) => c + 1);
      toast.success("Following!");
    } else {
      toast.error("Failed to follow");
    }
    setConnectionLoading(false);
  };

  const handleFollowPublic = async () => {
    if (!user || !userId) return;
    setConnectionLoading(true);
    const { data, error } = await supabase
      .from("connections")
      .insert({
        requester_id: user.id,
        addressee_id: userId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (!error && data) {
      setConnectionStatus("accepted");
      setConnectionId(data.id);
      setSocialCount((c) => c + 1);
      toast.success("Following!");
    } else {
      toast.error("Failed to follow");
    }
    setConnectionLoading(false);
  };

  const handleAddFriend = async () => {
    if (!user || !userId) return;
    setConnectionLoading(true);
    const { data, error } = await supabase
      .from("connections")
      .insert({ requester_id: user.id, addressee_id: userId })
      .select()
      .single();
    if (error) {
      toast.error("Failed to send friend request");
    } else {
      setConnectionStatus("pending_sent");
      setConnectionId(data.id);
      toast.success("Friend request sent!");
    }
    setConnectionLoading(false);
  };

  const handleCancelRequest = async () => {
    if (!user || !userId) return;
    setConnectionLoading(true);
    await supabase
      .from("connections")
      .delete()
      .eq("requester_id", user.id)
      .eq("addressee_id", userId);
    setConnectionStatus("none");
    setConnectionId(null);
    setConnectionLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!user || !userId) return;
    setConnectionLoading(true);
    const { error } = await supabase
      .from("connections")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("requester_id", userId)
      .eq("addressee_id", user.id);
    if (error) {
      toast.error("Failed to accept request");
    } else {
      setConnectionStatus("accepted");
      setSocialCount((c) => c + 1);
      toast.success("You are now friends!");
    }
    setConnectionLoading(false);
  };

  const displayName = profile?.display_name || profile?.username || "User";
  const username = profile?.username || displayName.toLowerCase().replace(/\s+/g, "");
  const avatarUrl = profile?.avatar_url;
  const isOrg = !!profile?._isOrganiser;
  const vibeTags: string[] = profile?._tags || [];

  // ── Event visibility gating ──
  // Personal profiles: upcoming only visible if friends or public profile
  // Organiser profiles: always show all events
  const canSeeUpcoming = isOrg || connectionStatus === "accepted" || targetIsPublic;

  const upcomingEvents = canSeeUpcoming
    ? events.filter((e) => new Date(e.event_date) >= new Date())
    : [];
  const pastEvents = events.filter((e) => new Date(e.event_date) < new Date());

  const isOwnProfile = user?.id === userId;

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

  const renderFriendButton = () => {
    if (isOwnProfile) return null;

    // Organiser profiles: follow/unfollow
    if (isOrg) {
      return isFollowingOrganiser ? (
        <Button
          variant="secondary"
          className="px-8 h-11 rounded-full font-semibold gap-2"
          onClick={() => setOptionsOpen(true)}
          disabled={connectionLoading}
        >
          <Users className="h-4 w-4" />
          FOLLOWING
        </Button>
      ) : (
        <Button
          className="px-8 h-11 rounded-full font-semibold gap-2"
          onClick={handleFollowOrganiser}
          disabled={connectionLoading}
        >
          <UserPlus className="h-4 w-4" />
          FOLLOW
        </Button>
      );
    }

    // Personal profiles
    switch (connectionStatus) {
      case "none":
        return (
          <Button
            className="px-8 h-11 rounded-full font-semibold gap-2"
            onClick={targetIsPublic ? handleFollowPublic : handleAddFriend}
            disabled={connectionLoading}
          >
            <UserPlus className="h-4 w-4" />
            + FRIEND
          </Button>
        );
      case "accepted":
        return (
          <Button
            variant="secondary"
            className="px-8 h-11 rounded-full font-semibold gap-2"
            onClick={() => setOptionsOpen(true)}
            disabled={connectionLoading}
          >
            <Users className="h-4 w-4" />
            FRIENDS
          </Button>
        );
      case "pending_sent":
        return (
          <Button
            variant="secondary"
            className="px-8 h-11 rounded-full font-semibold gap-2"
            onClick={handleCancelRequest}
            disabled={connectionLoading}
          >
            <Clock className="h-4 w-4" />
            REQUESTED
          </Button>
        );
      case "pending_received":
        return (
          <Button
            className="px-8 h-11 rounded-full font-semibold gap-2"
            onClick={handleAcceptRequest}
            disabled={connectionLoading}
          >
            <UserPlus className="h-4 w-4" />
            ACCEPT
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-foreground">{displayName}</span>
        {/* Notification bell for friends / following */}
        {!isOwnProfile && (connectionStatus === "accepted" || isFollowingOrganiser) && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setOptionsOpen(true)}
          >
            <Bell className={`h-5 w-5 ${connectionMuted || organiserMuted ? "text-muted-foreground" : "text-foreground"}`} />
          </Button>
        )}
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto">
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
            <h2 className="text-xl font-bold tracking-wide text-foreground uppercase font-display">
              {displayName}
            </h2>
            {(profile?._isOrganiser || profile?.is_verified) && (
              <BadgeCheck className="h-5 w-5 text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
            )}
          </div>

          <p className="text-muted-foreground text-sm mb-4">@{username}</p>

          <div className="flex items-center justify-center gap-6 mb-5">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{socialCount}</p>
              <p className="text-xs text-muted-foreground">{isOrg ? "Followers" : "Friends"}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{eventCount}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-5">
            {renderFriendButton()}
            {profile.instagram_handle ? (
              <Button
                variant="secondary"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => window.open(`https://instagram.com/${profile.instagram_handle}`, "_blank", "noopener,noreferrer")}
              >
                <Instagram className="h-5 w-5" />
              </Button>
            ) : null}
            <ShareProfileSheet profileUrl={`/user/${userId}`} displayName={displayName} />
          </div>

          {profile.bio && (
            <p className="text-foreground text-sm leading-relaxed max-w-[300px] mx-auto mb-3">
              {profile.bio}
            </p>
          )}

          {(profile.page_classification || profile.city) && (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm mb-3 mx-auto">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium tracking-wide text-foreground/80">
                {[profile.page_classification, profile.city].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}

          {/* Vibe Tags — organiser/venue profiles only */}
          {isOrg && vibeTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {vibeTags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-foreground/80 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Mutual Friends — personal profiles, not own profile */}
          {!isOwnProfile && !isOrg && userId && <MutualFriendsRow targetUserId={userId} />}
        </div>

        {/* Tabs */}
        <Tabs defaultValue={canSeeUpcoming ? "upcoming" : "past"} className="w-full">
          <TabsList className="w-full h-auto p-0 bg-transparent border-b border-border rounded-none">
            {canSeeUpcoming && (
              <TabsTrigger
                value="upcoming"
                className="flex-1 py-3 rounded-none bg-transparent text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
              >
                UPCOMING
              </TabsTrigger>
            )}
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

          {canSeeUpcoming && (
            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {loading ? (
                <LoadingSpinner message="Loading events..." />
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming events</p>
                </div>
              ) : (
                upcomingEvents.map((event: any) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors"
                  >
                    <div className="w-28 h-28 flex-shrink-0">
                      <img src={getEventFlyer(event.id)} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 px-4 py-3 min-w-0">
                      <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-3 capitalize leading-tight">{event.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
                          {format(new Date(event.event_date), "EEE M/d - ha")}
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
                ))
              )}
            </TabsContent>
          )}

          <TabsContent value="feed" className="mt-4">
            <UserProfileFeedTab userId={userId!} isOrganiser={isOrg} />
          </TabsContent>

          <TabsContent value="past" className="mt-4 space-y-3">
            {loading ? (
              <LoadingSpinner message="Loading events..." />
            ) : pastEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No past events</p>
              </div>
            ) : (
              pastEvents.map((event: any) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center bg-card rounded-2xl overflow-hidden hover:bg-card/80 transition-colors"
                >
                  <div className="w-28 h-28 flex-shrink-0">
                    <img src={getEventFlyer(event.id)} alt={event.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-3 capitalize leading-tight">{event.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
                        {format(new Date(event.event_date), "EEE M/d - ha")}
                      </span>
                      <span className="text-xs bg-secondary px-3 py-2 rounded-full text-muted-foreground font-medium h-7 flex items-center">
                        Past
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Friend/Follow Options Sheet (Instagram-style) */}
      {user && (
        <FriendOptionsSheet
          open={optionsOpen}
          onOpenChange={setOptionsOpen}
          displayName={displayName}
          userId={user.id}
          // Personal friend connection
          connectionId={connectionId || undefined}
          isMuted={connectionMuted}
          onMuteToggled={(muted) => setConnectionMuted(muted)}
          onUnfriended={() => {
            setConnectionStatus("none");
            setConnectionId(null);
            setSocialCount((c) => Math.max(0, c - 1));
          }}
          // Organiser follow
          organiserProfileId={isOrg ? userId : undefined}
          isOrganiserMuted={organiserMuted}
          onOrganiserMuteToggled={(muted) => setOrganiserMuted(muted)}
          onUnfollowed={() => {
            setIsFollowingOrganiser(false);
            setSocialCount((c) => Math.max(0, c - 1));
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

const UserProfileFeedTab = ({ userId, isOrganiser }: { userId: string; isOrganiser: boolean }) => {
  const { data: userPosts = [], isLoading: userLoading } = useUserFeedWithReposts(isOrganiser ? undefined : userId);
  const { data: orgPosts = [], isLoading: orgLoading } = useOrganiserPosts(isOrganiser ? userId : undefined);
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

export default UserProfile;
