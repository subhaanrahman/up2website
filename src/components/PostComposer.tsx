import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Image, CalendarDays } from "lucide-react";

interface PostComposerProps {
  displayName: string;
  username: string;
  avatarUrl: string;
}

const PostComposer = ({ displayName, username, avatarUrl }: PostComposerProps) => {
  const [isComposing, setIsComposing] = useState(false);
  const [postText, setPostText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isComposing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isComposing]);

  useEffect(() => {
    if (!isComposing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        if (!postText.trim()) {
          setIsComposing(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isComposing, postText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostText(e.target.value);
    // Auto-grow
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };

  return (
    <div ref={composerRef} className="px-4 py-3 border-b border-border">
      <div className="flex gap-3">
        <Link to="/profile">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-card text-foreground font-bold">
              {displayName[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to="/profile" className="font-bold text-foreground hover:underline">
              {displayName}
            </Link>
            <BadgeCheck className="h-4 w-4 text-primary fill-primary [&>path:last-child]:text-primary-foreground" />
            <span className="text-muted-foreground text-sm">@{username}</span>
          </div>

          {isComposing ? (
            <div className="mt-2 transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={postText}
                onChange={handleTextChange}
                placeholder="What's happening?"
                rows={3}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-sm leading-relaxed min-h-[80px]"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Image className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground text-xs"
                    onClick={() => {
                      setIsComposing(false);
                      setPostText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full px-4"
                    disabled={!postText.trim()}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p
              className="text-muted-foreground text-sm cursor-pointer mt-1"
              onClick={() => setIsComposing(true)}
            >
              Write Something...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
