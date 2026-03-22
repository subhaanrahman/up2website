import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, ChevronDown } from "lucide-react";
import { supabase } from '@/infrastructure/supabase';
import { messagingRepository } from "@/features/messaging/repositories/messagingRepository";
import { profilesRepository } from "@/features/social/repositories/profilesRepository";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useToast } from "@/hooks/use-toast";
import { trackInteraction } from "@/lib/interactionAnalytics";
import BottomNav from "@/components/BottomNav";

interface DmMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const DmThread = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [message, setMessage] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const { markChatRead } = useUnreadMessages();
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const lastTypingBroadcastRef = useRef(0);
  const scrollRef = useRef<HTMLElement | null>(null);
  const typingChannelRef = useRef<any>(null);

  // Mark thread as read on mount
  useEffect(() => {
    if (id) markChatRead(id);
  }, [id, markChatRead]);

  // Fetch thread metadata
  const { data: thread } = useQuery({
    queryKey: ["dm-thread", id],
    queryFn: async () => messagingRepository.getDmThread(id!),
    enabled: !!id,
  });

  // Fetch organiser profile for display
  const { data: organiser } = useQuery({
    queryKey: ["dm-organiser", thread?.organiser_profile_id],
    queryFn: async () =>
      thread ? profilesRepository.getOrganiserProfileById(thread.organiser_profile_id) : null,
    enabled: !!thread?.organiser_profile_id,
  });

  // Fetch the other user's profile (for organiser view)
  const { data: otherUserProfile } = useQuery({
    queryKey: ["dm-user-profile", thread?.user_id],
    queryFn: async () =>
      thread ? profilesRepository.getProfileByUserId(thread.user_id) : null,
    enabled: !!thread?.user_id && thread?.user_id !== user?.id,
  });

  // Determine if current user is the organiser side
  const isOrganiserSide = organiser && user && organiser.owner_id === user.id;
  const otherName = isOrganiserSide
    ? (otherUserProfile?.display_name || "User")
    : (organiser?.display_name || "Organiser");
  const otherAvatar = isOrganiserSide
    ? otherUserProfile?.avatar_url
    : organiser?.avatar_url;

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ["dm-messages", id],
    queryFn: async (): Promise<DmMessage[]> =>
      id ? (messagingRepository.getDmMessages(id) as Promise<DmMessage[]>) : [],
    enabled: !!id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`dm-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["dm-messages", id] });
      })
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (!user?.id) return;
        if (payload?.payload?.senderId === user.id) return;
        setIsOtherTyping(true);
        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => setIsOtherTyping(false), 2200);
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [id, queryClient, user?.id]);

  const senderDisplayName = profile?.displayName || profile?.username || "You";
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim() || !user || !thread || !id) return;
    const content = message.trim();
    setMessage("");

    const optimisticMsg: DmMessage = {
      id: `optimistic-${Date.now()}`,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData<DmMessage[]>(
      ["dm-messages", id],
      (prev = []) => [...prev, optimisticMsg],
    );

    try {
      await messagingRepository.sendDm({
        threadId: thread.id,
        senderId: user.id,
        content,
      });
      trackInteraction({ action: "dm_send", source: "dm_thread", metadata: { threadId: thread.id } });

      queryClient.invalidateQueries({ queryKey: ["dm-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["dm-threads"] });

      // Notify the other party — scope notification to the organiser profile
      const recipientId = isOrganiserSide ? thread.user_id : organiser?.owner_id;
      if (recipientId && recipientId !== user.id) {
        callEdgeFunction("notifications-send", {
          body: {
            type: "group_message",
            recipient_user_id: recipientId,
            title: `Message from ${senderDisplayName}`,
            message: content.length > 80 ? content.slice(0, 80) + "…" : content,
            avatar_url: profile?.avatarUrl || null,
            link: `/messages/dm/${thread.id}`,
            organiser_profile_id: !isOrganiserSide ? thread.organiser_profile_id : null,
          },
        }).catch(() => {});
      } else if (recipientId === user.id && !isOrganiserSide) {
        callEdgeFunction("notifications-send", {
          body: {
            type: "group_message",
            recipient_user_id: user.id,
            title: `Message from ${senderDisplayName}`,
            message: content.length > 80 ? content.slice(0, 80) + "…" : content,
            avatar_url: profile?.avatarUrl || null,
            link: `/messages/dm/${thread.id}`,
            organiser_profile_id: thread.organiser_profile_id,
          },
        }).catch(() => {});
      }
    } catch (err: unknown) {
      queryClient.setQueryData<DmMessage[]>(
        ["dm-messages", id],
        (prev = []) => prev.filter((m) => m.id !== optimisticMsg.id),
      );
      const msg = err instanceof Error ? err.message : "Failed to send message";
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    }
  };

  const broadcastTyping = () => {
    if (!id || !message.trim()) return;
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current < 1200) return;
    lastTypingBroadcastRef.current = now;
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { senderId: user?.id },
    }).catch(() => {});
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 56;
      setShowJumpToLatest(!nearBottom);
      if (nearBottom && id) markChatRead(id);
    };
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [id, markChatRead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 56;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    }
  }, [messages.length]);

  const lastOwnIndex = [...messages].map((m) => m.sender_id).lastIndexOf(user?.id || "");
  const hasReplyAfterLastOwn =
    lastOwnIndex !== -1 &&
    messages.slice(lastOwnIndex + 1).some((m) => m.sender_id && m.sender_id !== user?.id);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={otherAvatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {(otherName || "?")[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm capitalize">{otherName}</p>
          <p className="text-xs text-muted-foreground">{isOtherTyping ? "Typing..." : "Direct Message"}</p>
        </div>
      </header>

      {/* Messages */}
      <main ref={scrollRef as any} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {messages.map((msg, index) => {
          const own = msg.sender_id === user?.id;
          const isLatestOwn = own && index === lastOwnIndex;
          const pending = msg.id.startsWith("optimistic-");
          return (
            <div key={msg.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-tile px-4 py-2.5 ${
                  own
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${own ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {formatTime(msg.created_at)}
                </p>
                {isLatestOwn && (
                  <p className={`text-[10px] mt-0.5 ${own ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {pending ? "Sending..." : hasReplyAfterLastOwn ? "Seen" : "Delivered"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {showJumpToLatest && (
        <button
          onClick={() => {
            const el = scrollRef.current;
            if (!el) return;
            el.scrollTop = el.scrollHeight;
            setShowJumpToLatest(false);
          }}
          className="absolute bottom-20 right-4 h-9 px-3 rounded-full bg-card border border-border shadow-md inline-flex items-center gap-1 text-xs text-foreground"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Latest
        </button>
      )}

      {/* Input */}
      <div className="sticky bottom-16 bg-background border-t border-border px-4 py-3 flex items-center gap-2">
        <Input
          placeholder="Message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            broadcastTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 bg-secondary border-0 h-10 rounded-full"
        />
        <Button size="icon" className="h-10 w-10 rounded-full" onClick={handleSend} disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default DmThread;
