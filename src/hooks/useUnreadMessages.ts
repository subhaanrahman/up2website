import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/infrastructure/supabase";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "chat_last_read";

type LastReadMap = Record<string, string>;
type UnreadSummary = { perChat: Record<string, number>; total: number };

const unreadSummaryFallback: UnreadSummary = { perChat: {}, total: 0 };

let unreadRealtimeChannel: RealtimeChannel | null = null;
let unreadRealtimeSubscribers = 0;
let unreadRealtimeQueryClient: QueryClient | null = null;

function unreadMessagesKey(userId: string | undefined) {
  return ["unread-messages", userId] as const;
}

function unreadMessageBadgeKey(userId: string | undefined) {
  return ["unread-message-badge", userId] as const;
}

function getLastReadMap(): LastReadMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function hasLastReadEntries(lastReadMap: LastReadMap) {
  return Object.keys(lastReadMap).length > 0;
}

function setLastRead(chatId: string) {
  const map = getLastReadMap();
  map[chatId] = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function invalidateUnreadQueries() {
  unreadRealtimeQueryClient?.invalidateQueries({ queryKey: ["unread-messages"] });
  unreadRealtimeQueryClient?.invalidateQueries({ queryKey: ["unread-message-badge"] });
}

function acquireUnreadRealtimeSubscription(queryClient: QueryClient) {
  unreadRealtimeSubscribers += 1;
  unreadRealtimeQueryClient = queryClient;

  if (unreadRealtimeChannel) return;

  unreadRealtimeChannel = supabase
    .channel("unread-watcher")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_chat_messages" }, invalidateUnreadQueries)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, invalidateUnreadQueries)
    .subscribe();
}

function releaseUnreadRealtimeSubscription() {
  unreadRealtimeSubscribers = Math.max(0, unreadRealtimeSubscribers - 1);

  if (unreadRealtimeSubscribers > 0 || !unreadRealtimeChannel) return;

  supabase.removeChannel(unreadRealtimeChannel);
  unreadRealtimeChannel = null;
  unreadRealtimeQueryClient = null;
}

function useUnreadRealtimeSubscription(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    acquireUnreadRealtimeSubscription(queryClient);
    return () => releaseUnreadRealtimeSubscription();
  }, [enabled, queryClient]);
}

async function fetchUnreadMessageSummary(): Promise<UnreadSummary> {
  const lastReadMap = getLastReadMap();
  if (!hasLastReadEntries(lastReadMap)) return unreadSummaryFallback;

  const { data, error } = await supabase.rpc("get_unread_message_counts", {
    p_last_read: lastReadMap as any,
  });

  if (error) throw error;

  const perChat: Record<string, number> = {};
  let total = 0;

  for (const row of data || []) {
    const unread = Number(row.unread_count ?? 0);
    if (unread <= 0 || !row.chat_id) continue;
    perChat[row.chat_id] = unread;
    total += unread;
  }

  return { perChat, total };
}

async function fetchUnreadMessageTotal(): Promise<number> {
  const lastReadMap = getLastReadMap();
  if (!hasLastReadEntries(lastReadMap)) return 0;

  const { data, error } = await supabase.rpc("get_unread_message_total", {
    p_last_read: lastReadMap as any,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export function useMarkChatRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCallback((chatId: string) => {
    setLastRead(chatId);
    queryClient.invalidateQueries({ queryKey: unreadMessagesKey(user?.id) });
    queryClient.invalidateQueries({ queryKey: unreadMessageBadgeKey(user?.id) });
  }, [queryClient, user?.id]);
}

/**
 * Returns per-chat unread counts and a total using a server-side aggregate query.
 * Only use this on screens that actually need per-chat detail.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const markChatRead = useMarkChatRead();

  const query = useQuery({
    queryKey: unreadMessagesKey(user?.id),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<UnreadSummary> => {
      if (!user) return unreadSummaryFallback;

      try {
        return await fetchUnreadMessageSummary();
      } catch {
        return unreadSummaryFallback;
      }
    },
  });

  useUnreadRealtimeSubscription(!!user?.id);

  return {
    perChat: query.data?.perChat ?? {},
    totalUnread: query.data?.total ?? 0,
    markChatRead,
  };
}

/**
 * Lightweight badge count for global navigation.
 * Keeps the home page and shell off the heavier per-chat unread path.
 */
export function useUnreadMessageBadgeCount() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: unreadMessageBadgeKey(user?.id),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return 0;

      try {
        return await fetchUnreadMessageTotal();
      } catch {
        return 0;
      }
    },
  });

  useUnreadRealtimeSubscription(!!user?.id);

  return query.data ?? 0;
}
