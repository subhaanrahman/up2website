import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Repeat2, MoreHorizontal, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePostInteractions } from "@/hooks/usePostInteractions";
import { cn } from "@/lib/utils";

interface FeedPostProps {
  postId: string;
  authorId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  content: string | null;
  createdAt: string;
  imageUrl?: string | null;
  gifUrl?: string | null;
  repostedBy?: string;
}

const FeedPost = ({ postId, authorId, displayName, username, avatarUrl, content, createdAt, imageUrl, gifUrl, repostedBy }: FeedPostProps) => {
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: false });
  const { likeCount = 0, repostCount = 0, isLiked, isReposted, toggleLike, toggleRepost } = usePostInteractions(postId);

  return (
    <div className="px-4 py-4 border-b border-border">
      {repostedBy && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 pl-12">
          <Repeat2 className="h-3 w-3" />
          <span>{repostedBy} reposted</span>
        </div>
      )}
      <div className="flex gap-3">
        <Link to={`/user/${authorId}`}>
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-card text-foreground font-bold">
              {(displayName || "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/user/${authorId}`} className="font-bold text-foreground hover:underline">
                {displayName || username || "User"}
              </Link>
              <BadgeCheck className="h-4 w-4 text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
              <span className="text-muted-foreground text-sm">
                @{username || "user"} · {timeAgo}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          {content && (
            <p className="text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{content}</p>
          )}
          {imageUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border border-border">
              <img src={imageUrl} alt="Post image" className="w-full max-h-96 object-cover" loading="lazy" />
            </div>
          )}
          {gifUrl && (
            <div className="mt-2 rounded-xl overflow-hidden border border-border">
              <img src={gifUrl} alt="GIF" className="w-full max-h-96 object-cover" loading="lazy" />
            </div>
          )}
          <div className="flex items-center gap-6 mt-3">
            <button
              onClick={toggleLike}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              )}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
            </button>
            <button
              onClick={toggleRepost}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                isReposted ? "text-green-500" : "text-muted-foreground hover:text-green-500"
              )}
            >
              <Repeat2 className="h-4 w-4" />
              {repostCount > 0 && <span className="text-xs">{repostCount}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPost;
