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
        <Link to={`/user/${authorId}`}>
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
              <Link to={`/user/${authorId}`} className="font-semibold text-[15px] text-foreground hover:underline leading-tight truncate shrink-0">
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
          {content && (
            <p className="text-[15px] text-foreground mt-0.5 leading-[1.45] whitespace-pre-wrap">{content}</p>
          )}
          {imageUrl && (
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
