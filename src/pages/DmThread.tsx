import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

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
  const { markChatRead } = useUnreadMessages();

  // Mark thread as read on mount
  useEffect(() => {
    if (id) markChatRead(id);
  }, [id, markChatRead]);

  // Fetch thread metadata
  const { data: thread } = useQuery({
    queryKey: ["dm-thread", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dm_threads")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch organiser profile for display
  const { data: organiser } = useQuery({
    queryKey: ["dm-organiser", thread?.organiser_profile_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organiser_profiles")
        .select("display_name, avatar_url, owner_id")
        .eq("id", thread!.organiser_profile_id)
        .single();
      return data;
    },
    enabled: !!thread?.organiser_profile_id,
  });

  // Fetch the other user's profile (for organiser view)
  const { data: otherUserProfile } = useQuery({
    queryKey: ["dm-user-profile", thread?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", thread!.user_id)
        .single();
      return data;
    },
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
  const { data: messages } = useQuery({
    queryKey: ["dm-messages", id],
    queryFn: async (): Promise<DmMessage[]> => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("thread_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DmMessage[];
    },
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const senderDisplayName = profile?.displayName || profile?.username || "You";

  const handleSend = async () => {
    if (!message.trim() || !user || !thread) return;
    const content = message.trim();
    setMessage("");

    await supabase.from("dm_messages").insert({
      thread_id: thread.id,
      sender_id: user.id,
      content,
    });

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
          // If recipient is the organiser side, scope this notification to their organiser profile
          organiser_profile_id: !isOrganiserSide ? thread.organiser_profile_id : null,
        },
      }).catch(() => {});
    } else if (recipientId === user.id && !isOrganiserSide) {
      // User is DMing their own business profile — still send notification scoped to organiser
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
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
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
          <p className="text-xs text-muted-foreground">Direct Message</p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {(messages ?? []).map((msg) => {
          const own = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  own
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${own ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </main>

      {/* Input */}
      <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 flex items-center gap-2">
        <Input
          placeholder="Message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 bg-secondary border-0 h-10 rounded-full"
        />
        <Button size="icon" className="h-10 w-10 rounded-full" onClick={handleSend} disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DmThread;
