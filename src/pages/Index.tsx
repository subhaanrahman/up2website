import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Plus, Calendar, DollarSign, Loader2, Users, Sparkles, RefreshCw } from "lucide-react";
import { useUnreadCount } from "@/hooks/useNotificationsQuery";
import PostComposer from "@/components/PostComposer";
import FeedPost from "@/components/FeedPost";
import NearbyEventsCarousel from "@/components/NearbyEventsCarousel";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { usePaginatedFeed, useNearbyEvents } from "@/hooks/useFeedQuery";
import { useQueryClient } from "@tanstack/react-query";
import { getSuggestedFriends, type SuggestedProfile } from "@/features/social/services/recommendationService";
import { connectionsRepository } from "@/features/social/repositories/connectionsRepository";
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
  const SUGGESTED_INSERT_INDEX = 3;

  // v1 personalized feed with pagination
  const {
    posts: feedPosts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchFeed,
    isRefetching,
    hasPendingUpdates,
  } = usePaginatedFeed();

  // DB-backed nearby events
  const { data: nearbyEvents = [] } = useNearbyEvents(4);

  const [suggestedProfiles, setSuggestedProfiles] = useState<SuggestedProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Pull-to-refresh: use a scroll container we control so "at top" is reliable
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const pullDistanceRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 56;
  const PULL_MAX = 80;

  const handleRefresh = useCallback(async () => {
    await refetchFeed();
  }, [refetchFeed]);

  const isAtTop = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return false;
    return el.scrollTop <= 0;
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const applyPull = (clientY: number) => {
      if (!isAtTop()) {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        return;
      }
      const delta = clientY - touchStartY.current;
      if (delta > 0) {
        const distance = Math.min(delta * 0.6, PULL_MAX);
        pullDistanceRef.current = distance;
        setPullDistance(distance);
      }
    };
    const commitPull = () => {
      const current = pullDistanceRef.current;
      setPullDistance(0);
      pullDistanceRef.current = 0;
      if (current >= PULL_THRESHOLD) {
        handleRefresh();
      }
    };
    // Touch (mobile)
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      applyPull(e.touches[0].clientY);
    };
    const onTouchEnd = () => commitPull();
    // Mouse (desktop — drag down at top to refresh)
    const onMouseDown = (e: MouseEvent) => {
      touchStartY.current = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (e.buttons !== 1) return;
      applyPull(e.clientY);
    };
    const onMouseUp = () => commitPull();
    const onMouseLeave = () => {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mouseleave", onMouseLeave);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [handleRefresh, isAtTop]);

  // Infinite scroll observer (use scroll container as root)
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!sentinelRef.current || !scrollEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollEl, rootMargin: '200px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    setSuggestedProfiles([]);
    setPendingRequests(new Set());
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || suggestedProfiles.length > 0 || feedPosts.length <= SUGGESTED_INSERT_INDEX) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      getSuggestedFriends(user.id, 6).then((profiles) => {
        if (!cancelled) setSuggestedProfiles(profiles);
      });
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [feedPosts.length, suggestedProfiles.length, user?.id, SUGGESTED_INSERT_INDEX]);

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
      await connectionsRepository.sendRequest(user.id, friendUserId);
      toast({ title: "Friend request sent!" });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        toast({ title: "Request already sent" });
      } else {
        setPendingRequests((prev) => {
          const next = new Set(prev);
          next.delete(friendUserId);
          return next;
        });
        toast({ title: "Failed to send request", variant: "destructive" });
      }
    }
  }, [user]);

  const showSuggestedInline = suggestedProfiles.length > 0 && feedPosts.length > SUGGESTED_INSERT_INDEX;

  return (
    <div className="h-dvh flex flex-col bg-background md:min-h-screen md:h-auto">
      {/* Header */}
      <header className="flex-shrink-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
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

      {/* Scrollable feed area — pull-to-refresh and infinite scroll use this container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-20"
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out shrink-0"
          style={{ height: Math.max(pullDistance, isRefetching ? PULL_THRESHOLD : 0) }}
        >
          {(pullDistance > 0 || isRefetching) && (
            <div className="flex flex-col items-center gap-1 py-2">
              {isRefetching ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <RefreshCw
                  className="h-6 w-6 text-primary transition-transform duration-200"
                  style={{ transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)` }}
                />
              )}
            </div>
          )}
        </div>

        {hasPendingUpdates && !isRefetching && (
          <div className="px-4 pt-3 flex justify-center">
            <Button variant="secondary" size="sm" className="rounded-full" onClick={() => handleRefresh()}>
              New posts available
            </Button>
          </div>
        )}

        {/* Post Composer — only when logged in */}
        {user && (
          <PostComposer
            displayName={displayName}
            username={username}
            avatarUrl={avatarUrl}
            organiserProfileId={isOrganiser && activeOrg ? activeOrg.id : undefined}
            isVerified={isOrganiser || profile?.isVerified || false}
            onPostCreated={() => queryClient.invalidateQueries({ queryKey: ["feed-posts"] })}
          />
        )}

        {/* Events Near You — DB-backed auto-scroll carousel */}
        {nearbyEvents.length > 0 && (
          <NearbyEventsCarousel events={nearbyEvents} />
        )}

        {/* Feed Posts with inline suggested friends */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="flex flex-col items-center py-14 px-6 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-base">Your feed is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Follow friends and organisers to see their posts here</p>
            </div>
            <div className="flex gap-3 mt-1">
              <Link to="/search">
                <Button size="sm" className="rounded-full px-5 text-xs font-bold tracking-widest">
                  Browse Events
                </Button>
              </Link>
              <Link to="/profile/friends">
                <Button size="sm" variant="outline" className="rounded-full px-5 text-xs font-bold tracking-widest">
                  Find Friends
                </Button>
              </Link>
            </div>
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
      </div>

      {/* Floating Action Button - mobile only */}
      <div className="fixed bottom-24 z-40 w-full left-0 pointer-events-none md:hidden">
        <div className="flex justify-end px-4 pointer-events-auto w-fit ml-auto">
          <Link to="/create" className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all duration-150 active:scale-90 active:shadow-md">
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
        <h2 className="text-base font-black text-foreground uppercase font-display tracking-[0.05em]" style={{ fontStretch: "expanded" }}>Suggested Friends</h2>
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 px-4 pb-2">
          {profiles.map(friend => (
            <div key={friend.user_id} className="flex-shrink-0 w-32 rounded-tile bg-card border border-border p-4 flex flex-col items-center">
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
