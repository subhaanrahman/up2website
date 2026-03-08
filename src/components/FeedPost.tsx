import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Repeat2, MoreHorizontal, BadgeCheck, Calendar, MapPin } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { cn } from "@/lib/utils";

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
  eventData?: {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
    cover_image: string | null;
  } | null;
  collaborators?: { user_id: string; display_name: string; avatar_url: string | null }[];
}

const FeedPost = ({ postId, authorId, organiserProfileId, displayName, username, avatarUrl, content, createdAt, imageUrl, gifUrl, repostedBy, eventData, collaborators }: FeedPostProps) => {
  const profileLink = organiserProfileId ? `/user/${organiserProfileId}` : `/user/${authorId}`;
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: false });
  const firstName = (displayName || username || "User").split(" ")[0];
  const { likeCount = 0, repostCount = 0, isLiked, isReposted, toggleLike, toggleRepost } = usePostInteractions(postId);

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
            <AvatarImage src={avatarUrl || ""} />
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
              <BadgeCheck className="h-[15px] w-[15px] text-primary fill-primary [&>path:last-child]:text-primary-foreground shrink-0" />
              <span className="text-muted-foreground text-[15px] truncate">@{username || "user"}</span>
              <span className="text-muted-foreground text-[15px] shrink-0">·</span>
              <span className="text-muted-foreground text-[15px] shrink-0">{timeAgo}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 shrink-0">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Collaborators line */}
          {collaborators && collaborators.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-[15px] text-muted-foreground">with</span>
              <div className="flex items-center -space-x-1">
                {collaborators.slice(0, 3).map((c, i) => (
                  <Link key={i} to={`/user/${c.user_id}`}>
                    <Avatar className="h-4 w-4 border border-background">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="text-[7px] bg-muted">{c.display_name[0]}</AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
              <span className="text-[15px] text-foreground font-medium">
                {collaborators.map((c, i) => (
                  <span key={c.user_id}>
                    {i > 0 && ", "}
                    <Link to={`/user/${c.user_id}`} className="hover:underline">{c.display_name.split(" ")[0]}</Link>
                  </span>
                ))}
              </span>
            </div>
          )}

          {content && (
            <p className="text-[15px] text-foreground mt-0.5 leading-[1.45] whitespace-pre-wrap">{content}</p>
          )}

          {/* Event card */}
          {eventData && (
            <Link to={`/events/${eventData.id}`} className="block mt-2.5 rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-colors bg-card">
              {eventData.cover_image && (
                <img src={eventData.cover_image} alt={eventData.title} className="w-full h-32 object-cover" loading="lazy" />
              )}
              <div className="p-3">
                <h4 className="font-bold text-foreground text-sm">{eventData.title}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span>{format(new Date(eventData.event_date), "EEE, MMM d · h:mm a")}</span>
                </div>
                {eventData.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>{eventData.location}</span>
                  </div>
                )}
              </div>
            </Link>
          )}

          {!eventData && imageUrl && (
            <div className="mt-2.5 rounded-2xl overflow-hidden border border-border">
              <img src={imageUrl} alt="Post image" className="w-full max-h-[512px] object-cover" loading="lazy" />
            </div>
          )}
          {gifUrl && (
            <div className="mt-2.5 rounded-2xl overflow-hidden border border-border">
              <img src={gifUrl} alt="GIF" className="w-full max-h-[512px] object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex items-center gap-5 mt-2.5">
            <button
              onClick={toggleLike}
              className={cn(
                "flex items-center gap-1.5 transition-colors group",
                isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart className={cn("h-[18px] w-[18px]", isLiked && "fill-current")} />
              {likeCount > 0 && <span className="text-[13px] tabular-nums">{likeCount}</span>}
            </button>
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
