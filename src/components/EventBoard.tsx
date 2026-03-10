import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EventBoardProps {
  eventId: string;
}

interface BoardMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

const EventBoard = ({ eventId }: EventBoardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["event-board", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_messages")
        .select("id, content, created_at, user_id")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return data.map((m): BoardMessage => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          content: m.content,
          createdAt: m.created_at,
          userId: m.user_id,
          displayName: profile?.display_name || "User",
          avatarUrl: profile?.avatar_url || null,
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
      const { error } = await supabase.from("event_messages").insert({
        event_id: eventId,
        user_id: user.id,
        content: message.trim(),
      });
      if (error) throw error;
      setMessage("");
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
    <div className="bg-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Event Board</h3>
      </div>

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
          placeholder="Write a message..."
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
