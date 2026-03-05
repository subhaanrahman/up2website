import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Repeat2, MoreHorizontal, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedPostProps {
  authorId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
}

const FeedPost = ({ authorId, displayName, username, avatarUrl, content, createdAt }: FeedPostProps) => {
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: false });

  return (
    <div className="px-4 py-4 border-b border-border">
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
          <p className="text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{content}</p>
          <div className="flex items-center gap-6 mt-3">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Heart className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Repeat2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPost;
