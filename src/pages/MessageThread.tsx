import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, MoreVertical } from "lucide-react";
import GroupChatSettingsSheet from "@/components/GroupChatSettingsSheet";
import { supabase } from '@/infrastructure/supabase';
import { messagingRepository } from "@/features/messaging/repositories/messagingRepository";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfileQuery";
import { callEdgeFunction } from "@/infrastructure/api-client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  sender_name: string;
  sender_id: string | null;
  content: string;
  is_from_current_user: boolean;
  created_at: string;
}

const MessageThread = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [message, setMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const { markChatRead } = useUnreadMessages();

  // Mark chat as read on mount
  useEffect(() => {
    if (id) markChatRead(id);
  }, [id, markChatRead]);

  const { data: chat } = useQuery({
    queryKey: ["group-chat", id],
    queryFn: async () => messagingRepository.getGroupChat(id!),
    enabled: !!id,
  });

  const { data: messages } = useQuery({
    queryKey: ["group-chat-messages", id],
    queryFn: async (): Promise<ChatMessage[]> =>
      messagingRepository.getGroupMessages(id!) as Promise<ChatMessage[]>,
    enabled: !!id,
  });

  const chatName = (chat?.name ?? "Group Chat");
  const displayChatName = chatName.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  const initials = chatName.split(" ").map(w => w[0]).join("").slice(0, 2);

  const senderDisplayName = profile?.displayName || profile?.username || "You";
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim() || !user || !id) return;
    const content = message.trim();
    setMessage("");

    const optimisticMsg: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      sender_id: user.id,
      sender_name: senderDisplayName,
      content,
      is_from_current_user: true,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData<ChatMessage[]>(
      ["group-chat-messages", id],
      (prev = []) => [...prev, optimisticMsg],
    );

    try {
      await messagingRepository.sendGroupMessage({
        groupChatId: id,
        senderId: user.id,
        senderName: senderDisplayName,
        content,
      });

      queryClient.invalidateQueries({ queryKey: ["group-chat-messages", id] });
      queryClient.invalidateQueries({ queryKey: ["group-chats"] });

      const members = await messagingRepository.getGroupMembers(id, user.id);
      if (members?.length > 0) {
        const chatLabel = chatName || "Group Chat";
        members.forEach((m) => {
          callEdgeFunction("notifications-send", {
            body: {
              type: "group_message",
              recipient_user_id: m.user_id,
              title: chatLabel,
              message: `${senderDisplayName}: ${content.length > 80 ? content.slice(0, 80) + "…" : content}`,
              avatar_url: profile?.avatarUrl || null,
              link: `/messages/${id}`,
            },
          }).catch(() => {});
        });
      }
    } catch (err: unknown) {
      queryClient.setQueryData<ChatMessage[]>(
        ["group-chat-messages", id],
        (prev = []) => prev.filter((m) => m.id !== optimisticMsg.id),
      );
      const msg = err instanceof Error ? err.message : "Failed to send message";
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Realtime subscription for group chat messages
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`group-chat-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_chat_messages", filter: `group_chat_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["group-chat-messages", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const isOwnMessage = (msg: ChatMessage) => {
    if (!user) return false;
    return msg.sender_id === user.id;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Avatar className="h-9 w-9">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm capitalize">{displayChatName}</p>
          <p className="text-xs text-muted-foreground">{chat?.member_count ?? 0} members</p>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 text-muted-foreground"><MoreVertical className="h-5 w-5" /></button>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {(messages ?? []).map((msg) => {
          const own = isOwnMessage(msg);
          return (
            <div key={msg.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-tile px-4 py-2.5 ${
                  own
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                {!own && (
                  <p className="text-[10px] font-semibold text-primary mb-0.5">{msg.sender_name}</p>
                )}
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
      {chat && (
        <GroupChatSettingsSheet
          open={showSettings}
          onOpenChange={setShowSettings}
          chatId={chat.id}
          chatName={chat.name}
          memberCount={chat.member_count}
        />
      )}
    </div>
  );
};

export default MessageThread;
