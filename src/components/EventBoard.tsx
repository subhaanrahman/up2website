import { useState, useEffect, useRef } from "react";
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { messagingRepository } from "@/features/messaging/repositories/messagingRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import { postsRepository } from "@/features/social/repositories/postsRepository";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { trackInteraction } from "@/lib/interactionAnalytics";

interface EventBoardProps {
  eventId: string;
  canBroadcast?: boolean;
  organiserProfileId?: string | null;
}

interface BoardMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isBroadcast: boolean;
}

const HOST_TEMPLATES = [
  "Doors open in 30 minutes. See you soon.",
  "Venue update: check the pinned location before heading over.",
  "Final call: ticket sales close in 1 hour.",
];

const EventBoard = ({ eventId, canBroadcast = false, organiserProfileId = null }: EventBoardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["event-board", eventId],
    queryFn: async () => {
      const data = await messagingRepository.getEventMessages(eventId);
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((m) => m.user_id))];
      const profiles = await profilesRepository.getProfileDisplayInfo(userIds);
      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

      return data.map((m): BoardMessage => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          content: String(m.content).replace(/^\[Broadcast\]\s*/i, ""),
          createdAt: m.created_at,
          userId: m.user_id,
          displayName: profile?.display_name || "User",
          avatarUrl: profile?.avatar_url || null,
          isBroadcast: /^\[Broadcast\]\s*/i.test(m.content || ""),
        };
      });
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`event-board-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["event-board", eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      const outgoing = broadcastMode ? `[Broadcast] ${message.trim()}` : message.trim();
      await messagingRepository.sendEventMessage({
        eventId,
        userId: user.id,
        content: outgoing,
      });
      if (broadcastMode) {
        await postsRepository.createPost({
          authorId: user.id,
          content: message.trim(),
          organiserProfileId,
          eventId,
        });
        trackInteraction({ action: "event_broadcast_publish", eventId, source: "event_board" });
      }
      setMessage("");
      setBroadcastMode(false);
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-card rounded-tile-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Event Board</h3>
      </div>

      {canBroadcast && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {HOST_TEMPLATES.map((template) => (
              <button
                key={template}
                onClick={() => {
                  setMessage(template);
                  setBroadcastMode(true);
                }}
                className="px-3 py-1.5 rounded-full bg-secondary text-xs text-foreground whitespace-nowrap"
              >
                {template.split(":")[0]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setBroadcastMode((v) => !v)}
            className={`h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
              broadcastMode ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            {broadcastMode ? "Broadcast mode" : "Post update to feed"}
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-80 overflow-y-auto space-y-3 mb-3"
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No messages yet — be the first to post!
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={msg.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {(msg.displayName || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {msg.displayName}
                  </span>
                  {msg.isBroadcast && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                      Update
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="flex gap-2">
        <Input
          placeholder={broadcastMode ? "Share an update with everyone..." : "Write a message..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || sending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default EventBoard;
