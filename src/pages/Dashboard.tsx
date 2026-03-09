import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, MessageSquare, Radio } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CreateGroupChatModal from "@/components/CreateGroupChatModal";
import { getOptimizedUrl } from "@/lib/imageUtils";

/* ── Types ── */

interface MemberPreview {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface GroupChat {
  id: string;
  name: string;
  member_count: number;
  last_message?: string;
  last_message_time?: string;
  unread: number;
  memberPreviews: MemberPreview[];
}

interface DmThread {
  id: string;
  organiser_profile_id: string;
  organiser_name: string;
  organiser_avatar: string | null;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  last_message?: string;
  last_message_time?: string;
}

/* ── Hooks ── */

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "now";
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

const useGroupChats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-chats", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<GroupChat[]> => {
      if (!user) return [];

      const { data: memberships, error: memErr } = await supabase
        .from("group_chat_members")
        .select("group_chat_id")
        .eq("user_id", user.id);

      if (memErr || !memberships || memberships.length === 0) return [];

      const chatIds = memberships.map((m) => m.group_chat_id);

      const { data: chats, error } = await supabase
        .from("group_chats")
        .select("*")
        .in("id", chatIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (chats ?? []).map(async (chat) => {
          const [{ data: msgs }, { data: memberProfiles }] = await Promise.all([
            supabase
              .from("group_chat_messages")
              .select("sender_name, content, created_at")
              .eq("group_chat_id", chat.id)
              .order("created_at", { ascending: false })
              .limit(1),
            supabase.rpc("get_group_chat_member_profiles", {
              p_group_chat_id: chat.id,
            }),
          ]);

          const lastMsg = msgs?.[0];
          const timeDiff = lastMsg ? getRelativeTime(new Date(lastMsg.created_at)) : "";

          return {
            id: chat.id,
            name: chat.name,
            member_count: chat.member_count,
            last_message: lastMsg ? `${lastMsg.sender_name}: ${lastMsg.content}` : undefined,
            last_message_time: timeDiff,
            unread: 0,
            memberPreviews: ((memberProfiles as MemberPreview[]) || []).slice(0, 4),
          };
        })
      );

      return enriched;
    },
  });
};

const useDmThreads = (mode: "user" | "organiser", organiserProfileIds?: string[]) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dm-threads", mode, user?.id, organiserProfileIds],
    enabled: !!user,
    queryFn: async (): Promise<DmThread[]> => {
      if (!user) return [];

      let query = supabase.from("dm_threads").select("*").order("updated_at", { ascending: false });

      if (mode === "user") {
        query = query.eq("user_id", user.id);
      } else if (organiserProfileIds && organiserProfileIds.length > 0) {
        query = query.in("organiser_profile_id", organiserProfileIds);
      } else {
        return [];
      }

      const { data: threads, error } = await query;
      if (error || !threads || threads.length === 0) return [];

      // Fetch organiser profiles
      const orgIds = [...new Set(threads.map((t: any) => t.organiser_profile_id))];
      const { data: orgs } = await supabase
        .from("organiser_profiles")
        .select("id, display_name, avatar_url")
        .in("id", orgIds);
      const orgMap = new Map((orgs || []).map((o) => [o.id, o]));

      // Fetch user profiles (for organiser view)
      const userIds = [...new Set(threads.map((t: any) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      // Fetch last message per thread
      const threadIds = threads.map((t: any) => t.id);
      const { data: allMsgs } = await supabase
        .from("dm_messages")
        .select("thread_id, content, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      const lastMsgMap = new Map<string, { content: string; created_at: string }>();
      for (const msg of allMsgs || []) {
        if (!lastMsgMap.has(msg.thread_id)) {
          lastMsgMap.set(msg.thread_id, msg);
        }
      }

      return threads.map((t: any) => {
        const org = orgMap.get(t.organiser_profile_id);
        const prof = profileMap.get(t.user_id);
        const lastMsg = lastMsgMap.get(t.id);
        return {
          id: t.id,
          organiser_profile_id: t.organiser_profile_id,
          organiser_name: org?.display_name || "Organiser",
          organiser_avatar: org?.avatar_url || null,
          user_id: t.user_id,
          user_name: prof?.display_name || "User",
          user_avatar: prof?.avatar_url || null,
          last_message: lastMsg?.content,
          last_message_time: lastMsg ? getRelativeTime(new Date(lastMsg.created_at)) : undefined,
        };
      });
    },
  });
};

/* ── Components ── */

const GroupChatTile = ({ chat }: { chat: GroupChat }) => (
  <Link
    to={`/messages/${chat.id}`}
    className="group relative flex flex-col rounded-2xl bg-card border border-border/60 p-4 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 min-h-[168px] overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent rounded-2xl pointer-events-none" />

    <div className="relative flex -space-x-2">
      {chat.memberPreviews.slice(0, 3).map((m) => (
        <Avatar key={m.user_id} className="h-9 w-9 border-2 border-card ring-1 ring-border/30">
          <AvatarImage src={getOptimizedUrl(m.avatar_url, 'AVATAR_SM') || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
            {(m.display_name || "?")[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {chat.memberPreviews.length === 0 && (
        <Avatar className="h-9 w-9 border-2 border-card ring-1 ring-border/30">
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
            {chat.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      )}
      {chat.member_count > 3 && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-bold text-muted-foreground ring-1 ring-border/30">
          +{chat.member_count - 3}
        </div>
      )}
    </div>

    <div className="relative flex flex-col gap-1 mt-3">
      <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-200 capitalize">
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

const DmThreadTile = ({ thread, isOrganiserView }: { thread: DmThread; isOrganiserView: boolean }) => {
  const name = isOrganiserView ? thread.user_name : thread.organiser_name;
  const avatar = isOrganiserView ? thread.user_avatar : thread.organiser_avatar;

  return (
    <Link
      to={`/messages/dm/${thread.id}`}
      className="flex items-center gap-3 px-1 py-3 hover:bg-secondary/50 rounded-xl transition-colors"
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={getOptimizedUrl(avatar, 'AVATAR_SM') || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
          {(name || "?")[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground truncate capitalize">{name}</h3>
          {thread.last_message_time && (
            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{thread.last_message_time}</span>
          )}
        </div>
        {thread.last_message && (
          <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
        )}
      </div>
    </Link>
  );
};

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3 mt-2">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

/* ── Main page ── */

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { isOrganiser, organiserProfiles } = useActiveProfile();
  const { data: chats, isLoading: chatsLoading } = useGroupChats();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // For organiser view: get all organiser profiles owned by this user
  const { data: ownedOrgIds } = useQuery({
    queryKey: ["owned-org-ids", user?.id],
    enabled: !!user && isOrganiser,
    queryFn: async () => {
      const { data } = await supabase
        .from("organiser_profiles")
        .select("id")
        .eq("owner_id", user!.id);
      return (data || []).map((o) => o.id);
    },
  });

  // Personal/professional: DMs where user is the initiator
  const { data: userDms, isLoading: userDmsLoading } = useDmThreads("user");

  // Organiser: DMs where organiser receives messages
  const { data: orgDms, isLoading: orgDmsLoading } = useDmThreads(
    "organiser",
    isOrganiser ? ownedOrgIds : undefined
  );

  const isLoading = loading || chatsLoading || userDmsLoading || (isOrganiser && orgDmsLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  /* ── Organiser View ── */
  if (isOrganiser) {
    const inboxThreads = orgDms || [];

    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground tracking-tight text-center">MESSAGES</h1>
        </header>

        <main className="px-4">
          {/* Inbox section */}
          <SectionDivider label="Inbox" />
          {inboxThreads.length > 0 ? (
            <div className="space-y-1">
              {inboxThreads.map((thread) => (
                <DmThreadTile key={thread.id} thread={thread} isOrganiserView />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">When users message you, they'll appear here</p>
            </div>
          )}

          {/* Broadcast coming soon */}
          <SectionDivider label="Broadcast Channels" />
          <div className="text-center py-8 text-muted-foreground">
            <Radio className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Coming Soon</p>
            <p className="text-xs mt-1">Broadcast updates to all your followers</p>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  /* ── Personal / Professional View ── */
  const groupChats = chats || [];
  const dmThreads = userDms || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight text-center">GROUP CHATS</h1>
      </header>

      <main className="px-4">
        {/* Group chats grid */}
        {groupChats.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {groupChats.map((chat) => (
              <GroupChatTile key={chat.id} chat={chat} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No group chats yet</p>
            <p className="text-xs mt-1">Create one with 3+ friends</p>
          </div>
        )}

        {/* Organisers DM section */}
        <SectionDivider label="Organisers" />
        {dmThreads.length > 0 ? (
          <div className="space-y-1">
            {dmThreads.map((thread) => (
              <DmThreadTile key={thread.id} thread={thread} isOrganiserView={false} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Message organisers from their profile page</p>
          </div>
        )}
      </main>

      {/* FAB — create group chat */}
      <div className="fixed bottom-24 z-40 w-full md:max-w-[430px] md:left-1/2 md:-translate-x-1/2 left-0 pointer-events-none">
        <div className="flex justify-end px-4 pointer-events-auto w-fit ml-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-7 w-7 text-primary-foreground" />
          </button>
        </div>
      </div>

      <CreateGroupChatModal open={showCreateModal} onOpenChange={setShowCreateModal} />

      <BottomNav />
    </div>
  );
};

export default Dashboard;
