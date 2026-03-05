import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface GroupChat {
  id: string;
  name: string;
  member_count: number;
  last_message?: string;
  last_message_time?: string;
  unread: number;
}

const useGroupChats = () => {
  return useQuery({
    queryKey: ["group-chats"],
    queryFn: async (): Promise<GroupChat[]> => {
      const { data: chats, error } = await supabase
        .from("group_chats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch latest message per chat
      const enriched = await Promise.all(
        (chats ?? []).map(async (chat) => {
          const { data: msgs } = await supabase
            .from("group_chat_messages")
            .select("sender_name, content, created_at")
            .eq("group_chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMsg = msgs?.[0];
          const timeDiff = lastMsg
            ? getRelativeTime(new Date(lastMsg.created_at))
            : "";

          return {
            id: chat.id,
            name: chat.name,
            member_count: chat.member_count,
            last_message: lastMsg
              ? `${lastMsg.sender_name}: ${lastMsg.content}`
              : undefined,
            last_message_time: timeDiff,
            unread: 0, // placeholder
          };
        })
      );

      return enriched;
    },
  });
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "now";
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

const GroupChatTile = ({ chat }: { chat: GroupChat }) => (
  <Link
    to={`/messages/${chat.id}`}
    className="group relative flex flex-col rounded-2xl bg-card border border-border/60 p-4 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 min-h-[168px] overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent rounded-2xl pointer-events-none" />

    {/* Stacked avatars */}
    <div className="relative flex -space-x-2">
      {Array.from({ length: Math.min(3, chat.member_count) }).map((_, i) => (
        <Avatar key={i} className="h-9 w-9 border-2 border-card ring-1 ring-border/30">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
            {chat.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      ))}
      {chat.member_count > 3 && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-bold text-muted-foreground ring-1 ring-border/30">
          +{chat.member_count - 3}
        </div>
      )}
    </div>

    {/* Info */}
    <div className="relative flex flex-col gap-1 mt-3">
      <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-200">
        {chat.name}
      </h3>
      {chat.last_message && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {chat.last_message}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
          <Users className="h-3 w-3" />
          {chat.member_count}
        </span>
        {chat.last_message_time && (
          <span className="text-[10px] text-muted-foreground/80">{chat.last_message_time}</span>
        )}
      </div>
    </div>
  </Link>
);

const Dashboard = () => {
  const { loading } = useAuth();
  const { data: chats, isLoading } = useGroupChats();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight text-center">GROUP CHATS</h1>
      </header>

      <main className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {(chats ?? []).map((chat) => (
            <GroupChatTile key={chat.id} chat={chat} />
          ))}
        </div>
      </main>

      <div className="fixed bottom-24 z-40 w-full md:max-w-[430px] md:left-1/2 md:-translate-x-1/2 left-0 pointer-events-none">
        <div className="flex justify-end px-4 pointer-events-auto w-fit ml-auto">
          <button className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
            <Plus className="h-7 w-7 text-primary-foreground" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
