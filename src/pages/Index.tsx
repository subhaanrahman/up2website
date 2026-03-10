import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Plus, Calendar, DollarSign, Loader2 } from "lucide-react";
import { useUnreadCount } from "@/hooks/useNotificationsQuery";
import PostComposer from "@/components/PostComposer";
import FeedPost from "@/components/FeedPost";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { usePaginatedFeed, useNearbyEvents } from "@/hooks/useFeedQuery";
import { useQueryClient } from "@tanstack/react-query";
import { getSuggestedFriends, type SuggestedProfile } from "@/features/social/services/recommendationService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getEventFlyer } from "@/lib/eventFlyerUtils";
import logoImg from "@/assets/logo.png";

const Index = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();
  const unreadCount = useUnreadCount();
  const queryClient = useQueryClient();

  // v1 personalized feed with pagination
  const { posts: feedPosts, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = usePaginatedFeed();

  // DB-backed nearby events
  const { data: nearbyEvents = [] } = useNearbyEvents(4);

  const [suggestedProfiles, setSuggestedProfiles] = useState<SuggestedProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    getSuggestedFriends(user?.id, 6).then(setSuggestedProfiles);
  }, [user?.id]);

  const activeOrg = isOrganiser
    ? organiserProfiles.find((o) => o.id === activeProfile?.id)
    : undefined;

  const displayName = isOrganiser && activeOrg ? activeOrg.displayName : (profile?.displayName || user?.email?.split("@")[0] || "Guest");
  const username = isOrganiser && activeOrg ? activeOrg.username : (profile?.username || displayName.toLowerCase().replace(/\s+/g, ""));
  const avatarUrl = isOrganiser && activeOrg ? (activeOrg.avatarUrl || "") : (profile?.avatarUrl || "");

  const handleAddFriend = useCallback(async (friendUserId: string) => {
    if (!user) return;
    setPendingRequests((prev) => new Set(prev).add(friendUserId));
    try {
      const { error } = await supabase.from("connections").insert({
        requester_id: user.id,
        addressee_id: friendUserId,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Request already sent" });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Friend request sent!" });
      }
    } catch {
      setPendingRequests((prev) => {
        const next = new Set(prev);
        next.delete(friendUserId);
        return next;
      });
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  }, [user]);

  // Show suggested friends after a few posts (inserted at position 3)
  const SUGGESTED_INSERT_INDEX = 3;
  const showSuggestedInline = suggestedProfiles.length > 0 && feedPosts.length > SUGGESTED_INSERT_INDEX;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-center px-4 h-14 relative">
          <img src={logoImg} alt="Up2" className="h-8 w-auto animate-snakeSlide" />
          <div className="absolute right-4">
            <Link to="/notifications" className="relative">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary">
                <Bell className="h-5 w-5 text-foreground" />
              </Button>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Post Composer */}
        <PostComposer
          displayName={displayName}
          username={username}
          avatarUrl={avatarUrl}
          organiserProfileId={isOrganiser && activeOrg ? activeOrg.id : undefined}
          isVerified={isOrganiser || profile?.isVerified || false}
          onPostCreated={() => queryClient.invalidateQueries({ queryKey: ["feed-posts"] })}
        />

        {/* Events Near You — DB-backed */}
        {nearbyEvents.length > 0 && (
          <div className="border-b border-border">
            <div className="px-4 py-3">
              <h2 className="text-base font-black text-foreground uppercase font-display tracking-[0.05em]" style={{ fontStretch: 'expanded' }}>Events Near You</h2>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-2">
              {nearbyEvents.map((event: any) => (
                <Link key={event.id} to={`/events/${event.id}`} className="flex rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors">
                  <div className="w-28 h-28 flex-shrink-0 overflow-hidden bg-muted">
                    <img
                      src={event.cover_image || getEventFlyer(event.id)}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 px-4 py-3 flex flex-col justify-center min-w-0">
                    <h3 className="font-bold text-foreground text-sm truncate capitalize">{event.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span>{format(new Date(event.event_date), "EEE M/d - ha")}</span>
                    </div>
                    {event.location && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.location}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <DollarSign className="h-3 w-3 text-primary" />
                      <span>{event.ticket_price_cents === 0 ? "Free" : `R${(event.ticket_price_cents / 100).toFixed(2)}`}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Feed Posts with inline suggested friends */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No posts yet. Be the first to post!
          </div>
        ) : (
          <>
            {feedPosts.map((post, idx) => (
              <div key={post._feedKey || post.id}>
                {/* Insert suggested friends after SUGGESTED_INSERT_INDEX posts */}
                {idx === SUGGESTED_INSERT_INDEX && showSuggestedInline && (
                  <SuggestedFriendsSection
                    profiles={suggestedProfiles}
                    pendingRequests={pendingRequests}
                    onAddFriend={handleAddFriend}
                  />
                )}
                <FeedPost
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
              </div>
            ))}

            {/* Fallback: if feed is short, show suggested friends at the bottom */}
            {!showSuggestedInline && suggestedProfiles.length > 0 && (
              <SuggestedFriendsSection
                profiles={suggestedProfiles}
                pendingRequests={pendingRequests}
                onAddFriend={handleAddFriend}
              />
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button - mobile only */}
      <div className="fixed bottom-24 z-40 w-full left-0 pointer-events-none md:hidden">
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

// ─── Suggested friends inline section ───
function SuggestedFriendsSection({
  profiles,
  pendingRequests,
  onAddFriend,
}: {
  profiles: SuggestedProfile[];
  pendingRequests: Set<string>;
  onAddFriend: (id: string) => void;
}) {
  return (
    <div className="py-4 border-b border-border">
      <div className="px-4 pb-3">
        <h2 className="text-base font-semibold text-foreground">Suggested Friends</h2>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 px-4 pb-2">
          {profiles.map(friend => (
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
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full rounded-full text-xs"
                disabled={pendingRequests.has(friend.user_id)}
                onClick={() => onAddFriend(friend.user_id)}
              >
                {pendingRequests.has(friend.user_id) ? "Requested" : "+ Friend"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Index;
