import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "chat_last_read";

type LastReadMap = Record<string, string>; // chatId -> ISO timestamp

function getLastReadMap(): LastReadMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setLastRead(chatId: string) {
  const map = getLastReadMap();
  map[chatId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Returns per-chat unread counts and a total, using localStorage timestamps.
 * Also provides markChatRead() to stamp current time for a chat.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user,
    refetchInterval: 30_000, // poll every 30s
    queryFn: async (): Promise<{ perChat: Record<string, number>; total: number }> => {
      if (!user) return { perChat: {}, total: 0 };

      // 1. Get user's group chat memberships
      const { data: memberships } = await supabase
        .from("group_chat_members")
        .select("group_chat_id")
        .eq("user_id", user.id);

      const chatIds = (memberships || []).map((m) => m.group_chat_id);

      // 2. Get user's DM threads
      const { data: dmThreads } = await supabase
        .from("dm_threads")
        .select("id")
        .eq("user_id", user.id);

      const dmIds = (dmThreads || []).map((t) => t.id);

      const lastReadMap = getLastReadMap();
      const perChat: Record<string, number> = {};
      let total = 0;

      // 3. Count unread group chat messages per chat
      if (chatIds.length > 0) {
        await Promise.all(
          chatIds.map(async (chatId) => {
            const lastRead = lastReadMap[chatId];
            // No stored timestamp = user hasn't visited yet, don't count as unread
            if (!lastRead) return;

            let q = supabase
              .from("group_chat_messages")
              .select("id", { count: "exact", head: true })
              .eq("group_chat_id", chatId)
              .neq("sender_id", user.id)
              .gt("created_at", lastRead);

            const { count } = await q;
            const unread = count || 0;
            if (unread > 0) {
              perChat[chatId] = unread;
              total += unread;
            }
          })
        );
      }

      // 4. Count unread DM messages per thread
      if (dmIds.length > 0) {
        await Promise.all(
          dmIds.map(async (threadId) => {
            const lastRead = lastReadMap[threadId];
            if (!lastRead) return;

            let q = supabase
              .from("dm_messages")
              .select("id", { count: "exact", head: true })
              .eq("thread_id", threadId)
              .neq("sender_id", user.id)
              .gt("created_at", lastRead);

            const { count } = await q;
            const unread = count || 0;
            if (unread > 0) {
              perChat[threadId] = unread;
              total += unread;
            }
          })
        );
      }

      return { perChat, total };
    },
  });

  // Realtime: invalidate on new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("unread-watcher")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_chat_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread-messages", user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markChatRead = useCallback(
    (chatId: string) => {
      setLastRead(chatId);
      queryClient.invalidateQueries({ queryKey: ["unread-messages", user?.id] });
    },
    [user?.id, queryClient]
  );

  return {
    perChat: query.data?.perChat ?? {},
    totalUnread: query.data?.total ?? 0,
    markChatRead,
  };
}
