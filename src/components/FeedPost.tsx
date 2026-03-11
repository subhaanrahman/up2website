import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Repeat2, MoreHorizontal, BadgeCheck, Calendar, MapPin, Trash2, Flag, Ban } from "lucide-react";
import { getOptimizedUrl } from "@/lib/imageUtils";
import { formatDistanceToNow, format } from "date-fns";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { cn } from "@/lib/utils";
import ReactionPicker from "@/components/ReactionPicker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedPostProps {
  postId: string;
  authorId: string;
  organiserProfileId?: string | null;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  content: string | null;
  createdAt: string;
  imageUrl?: string | null;
  gifUrl?: string | null;
  repostedBy?: string;
  isVerified?: boolean;
  eventData?: {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
    cover_image: string | null;
  } | null;
  collaborators?: { user_id: string; display_name: string; avatar_url: string | null }[];
}

const FeedPost = ({ postId, authorId, organiserProfileId, displayName, username, avatarUrl, content, createdAt, imageUrl, gifUrl, repostedBy, isVerified, eventData, collaborators }: FeedPostProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profileLink = organiserProfileId ? `/user/${organiserProfileId}` : `/user/${authorId}`;
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: false });
  const firstName = (displayName || username || "User").split(" ")[0];
  const isOwnPost = user?.id === authorId;
  const {
    likeCount = 0,
    repostCount = 0,
    isLiked,
    isReposted,
    reactionType,
    reactionBreakdown,
    handleReact,
    handleUnreact,
    toggleRepost,
  } = usePostInteractions(postId);

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const handleReport = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_post_id: postId,
        reported_user_id: authorId,
        reason: "inappropriate",
      });
      if (error) throw error;
      toast({ title: "Post reported", description: "We'll review this shortly." });
    } catch {
      toast({ title: "Failed to report", variant: "destructive" });
    }
  };

  const handleBlock = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: authorId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["feed-context"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "User blocked", description: "You won't see their posts anymore." });
    } catch {
      toast({ title: "Failed to block user", variant: "destructive" });
    }
  };

  return (
    <div className="px-4 py-3 border-b border-border">
      {repostedBy && (
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-1.5 pl-[52px]">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{repostedBy} reposted</span>
        </div>
      )}
      <div className="flex gap-3">
        <Link to={profileLink}>
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={getOptimizedUrl(avatarUrl, 'AVATAR_MD') || ""} />
            <AvatarFallback className="bg-card text-foreground font-bold text-sm">
              {(displayName || "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
              <Link to={profileLink} className="font-semibold text-[15px] text-foreground hover:underline leading-tight truncate shrink-0">
                {firstName}
              </Link>
              {isVerified && <BadgeCheck className="h-[15px] w-[15px] text-primary fill-primary [&>path:last-child]:text-primary-foreground shrink-0" />}
              <span className="text-muted-foreground text-[15px] truncate">@{username || "user"}</span>
              <span className="text-muted-foreground text-[15px] shrink-0">·</span>
              <span className="text-muted-foreground text-[15px] shrink-0">{timeAgo}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 shrink-0">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />Delete Post
                  </DropdownMenuItem>
                )}
                {!isOwnPost && (
                  <>
                    <DropdownMenuItem onClick={handleReport}>
                      <Flag className="h-4 w-4 mr-2" />Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                      <Ban className="h-4 w-4 mr-2" />Block User
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>


          {content && (
            <p className="text-[15px] text-foreground mt-0.5 leading-[1.45] whitespace-pre-wrap">{content}</p>
          )}

          {/* Event card */}
          {eventData && (
            <Link to={`/events/${eventData.id}`} className="flex mt-2.5 rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-colors bg-card">
              <div className="w-28 h-28 flex-shrink-0 overflow-hidden bg-muted">
                <img
                  src={eventData.cover_image || ""}
                  alt={eventData.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 px-4 py-3 flex flex-col justify-center min-w-0">
                <h4 className="font-bold text-foreground text-sm truncate capitalize">{eventData.title}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span>{format(new Date(eventData.event_date), "EEE M/d - ha")}</span>
                </div>
                {eventData.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="truncate">{eventData.location}</span>
                  </div>
                )}
              </div>
            </Link>
          )}

          {!eventData && imageUrl && (
            <div className="mt-2.5 rounded-2xl overflow-hidden border border-border">
              <img src={getOptimizedUrl(imageUrl, 'FEED_IMAGE') || imageUrl} alt="Post image" className="w-full max-h-[512px] object-cover" loading="lazy" />
            </div>
          )}
          {gifUrl && (
            <div className="mt-2.5 rounded-2xl overflow-hidden border border-border">
              <img src={gifUrl} alt="GIF" className="w-full max-h-[512px] object-cover" loading="lazy" />
            </div>
          )}

          {/* Interactions row */}
          <div className="flex items-center gap-5 mt-2.5">
            <ReactionPicker
              currentReaction={reactionType}
              onReact={handleReact}
              onUnreact={handleUnreact}
              likeCount={likeCount}
              isLiked={!!isLiked}
              reactionBreakdown={reactionBreakdown}
            />
            <button
              onClick={toggleRepost}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                isReposted ? "text-green-500" : "text-muted-foreground hover:text-green-500"
              )}
            >
              <Repeat2 className="h-[18px] w-[18px]" />
              {repostCount > 0 && <span className="text-[13px] tabular-nums">{repostCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPost;
