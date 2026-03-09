import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Plus, Calendar, DollarSign } from "lucide-react";
import { useUnreadCount } from "@/hooks/useNotificationsQuery";
import PostComposer from "@/components/PostComposer";
import FeedPost from "@/components/FeedPost";
import BottomNav from "@/components/BottomNav";
import { events } from "@/data/events";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useFeedPosts } from "@/hooks/usePostsQuery";
import { useQueryClient } from "@tanstack/react-query";
import { getSuggestedFriends, type SuggestedProfile } from "@/features/social/services/recommendationService";
import logoImg from "@/assets/logo.png";

const Index = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { activeProfile, isOrganiser, organiserProfiles } = useActiveProfile();
  const nearbyEvents = events.slice(0, 2);
  const unreadCount = useUnreadCount();
  const queryClient = useQueryClient();

  const [suggestedProfiles, setSuggestedProfiles] = useState<SuggestedProfile[]>([]);
  const { data: feedPosts = [] } = useFeedPosts();

  useEffect(() => {
    getSuggestedFriends(user?.id, 6).then(setSuggestedProfiles);
  }, [user?.id]);

  const activeOrg = isOrganiser
    ? organiserProfiles.find((o) => o.id === activeProfile?.id)
    : undefined;

  const displayName = isOrganiser && activeOrg ? activeOrg.displayName : (profile?.displayName || user?.email?.split("@")[0] || "Guest");
  const username = isOrganiser && activeOrg ? activeOrg.username : (profile?.username || displayName.toLowerCase().replace(/\s+/g, ""));
  const avatarUrl = isOrganiser && activeOrg ? (activeOrg.avatarUrl || "") : (profile?.avatarUrl || "");

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

        {/* Events Near You */}
        <div className="border-b border-border">
          <div className="px-4 py-3">
            <h2 className="text-base font-black text-foreground uppercase font-display tracking-[0.05em]" style={{ fontStretch: 'expanded' }}>Events Near You</h2>
          </div>
          <div className="px-4 pb-4 flex flex-col gap-2">
            {nearbyEvents.map(event => (
              <Link key={event.id} to={`/events/${event.id}`} className="flex rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors">
                <div className="w-28 h-28 flex-shrink-0 overflow-hidden bg-muted">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 px-4 py-3 flex flex-col justify-center min-w-0">
                  <p className="text-xs text-muted-foreground">{event.host.name}</p>
                  <h3 className="font-bold text-foreground text-sm truncate capitalize">{event.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3 text-primary" />
                    <span>{event.date} - {event.time}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <DollarSign className="h-3 w-3 text-primary" />
                    <span>{event.price === 0 ? "Free" : `$${event.price.toFixed(2)}`}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Real Feed Posts */}
        {feedPosts.map((post, idx) => (
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

        {feedPosts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No posts yet. Be the first to post!
          </div>
        )}

        {/* Suggested Friends */}
        {suggestedProfiles.length > 0 && (
          <div className="py-4 border-b border-border">
            <div className="px-4 pb-3">
              <h2 className="text-base font-semibold text-foreground">Suggested Friends</h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 px-4 pb-2">
                {suggestedProfiles.map(friend => (
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
                    <Button variant="secondary" size="sm" className="mt-3 w-full rounded-full text-xs">
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

export default Index;
