import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export type ReactionType = "heart" | "fire" | "eyes" | "pray" | "mood";

interface ReactionPickerProps {
  currentReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  onUnreact: () => void;
  likeCount: number;
  isLiked: boolean;
  reactionBreakdown?: Record<string, number>;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "fire", emoji: "🔥", label: "Lit" },
  { type: "eyes", emoji: "👀", label: "Bet" },
  { type: "pray", emoji: "🙏", label: "Yessir" },
  { type: "mood", emoji: "🩷", label: "Mood" },
];

const REACTION_EMOJI_MAP: Record<ReactionType, string> = {
  heart: "❤️",
  fire: "🔥",
  eyes: "👀",
  pray: "🙏",
  mood: "🩷",
};

export function getReactionEmoji(type: ReactionType): string {
  return REACTION_EMOJI_MAP[type] || "❤️";
}

/** Returns top emojis sorted by count (max 3) */
function getTopReactions(breakdown: Record<string, number>): { emoji: string; count: number }[] {
  return Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({
      emoji: REACTION_EMOJI_MAP[type as ReactionType] || "❤️",
      count,
    }));
}

const ReactionPicker = ({
  currentReaction,
  onReact,
  onUnreact,
  likeCount,
  isLiked,
  reactionBreakdown,
}: ReactionPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [animatingReaction, setAnimatingReaction] = useState<ReactionType | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowPicker(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!showPicker) {
      if (isLiked) {
        onUnreact();
      } else {
        setAnimatingReaction("heart");
        onReact("heart");
        setTimeout(() => setAnimatingReaction(null), 400);
      }
    }
  }, [showPicker, isLiked, onReact, onUnreact]);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleSelectReaction = useCallback(
    (type: ReactionType) => {
      setShowPicker(false);
      if (currentReaction === type) {
        onUnreact();
      } else {
        setAnimatingReaction(type);
        onReact(type);
        setTimeout(() => setAnimatingReaction(null), 400);
      }
    },
    [currentReaction, onReact, onUnreact]
  );

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [showPicker]);

  const displayEmoji = currentReaction ? getReactionEmoji(currentReaction) : null;
  const topReactions = reactionBreakdown ? getTopReactions(reactionBreakdown) : [];
  const hasMultipleTypes = topReactions.length > 1;

  return (
    <div ref={containerRef} className="relative">
      {/* Reaction picker popup */}
      {showPicker && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-lg">
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                onClick={() => handleSelectReaction(r.type)}
                className={cn(
                  "text-xl hover:scale-125 transition-transform duration-150 px-1 rounded-full",
                  currentReaction === r.type && "bg-secondary scale-110"
                )}
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main button */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className={cn(
          "flex items-center gap-1 transition-colors group select-none touch-none",
          isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
        )}
      >
        {/* Show stacked emoji breakdown or single emoji */}
        {hasMultipleTypes && likeCount > 0 ? (
          <span className="flex items-center -space-x-0.5">
            {topReactions.map((r, i) => (
              <span
                key={i}
                className={cn(
                  "text-[15px] leading-none",
                  animatingReaction && i === 0 && "animate-bounce"
                )}
              >
                {r.emoji}
              </span>
            ))}
          </span>
        ) : (
          <span
            className={cn(
              "text-[18px] leading-none",
              animatingReaction && "animate-bounce"
            )}
          >
            {isLiked && displayEmoji ? displayEmoji : "🤍"}
          </span>
        )}
        {likeCount > 0 && (
          <span className="text-[13px] tabular-nums ml-0.5">{likeCount}</span>
        )}
      </button>
    </div>
  );
};

export default ReactionPicker;
