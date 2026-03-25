import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { useEffect } from "react";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  avatar_url: string | null;
  event_image: string | null;
  link: string | null;
  created_at: string;
  expires_at: string;
  organiser_profile_id: string | null;
}

/** Notification types that are hidden from the user-facing list and unread count. */
export const HIDDEN_NOTIFICATION_TYPES = new Set(["suggested_account"]);

const notificationSelectFields = [
  "id",
  "user_id",
  "type",
  "title",
  "message",
  "read",
  "avatar_url",
  "event_image",
  "link",
  "created_at",
  "expires_at",
  "organiser_profile_id",
].join(", ");

function notificationsKey(userId: string | undefined, activeOrgId: string | null) {
  return ["notifications", userId, activeOrgId] as const;
}

function unreadNotificationsKey(userId: string | undefined, activeOrgId: string | null) {
  return ["notifications-unread-count", userId, activeOrgId] as const;
}

function applyNotificationScope<TQuery>(query: TQuery, activeOrgId: string | null) {
  let scoped = query as any;
  if (activeOrgId) {
    scoped = scoped.eq("organiser_profile_id", activeOrgId);
  } else {
    scoped = scoped.is("organiser_profile_id", null);
  }
  return scoped as TQuery;
}

function applyHiddenNotificationTypeFilter<TQuery>(query: TQuery) {
  const hiddenTypes = [...HIDDEN_NOTIFICATION_TYPES];
  if (hiddenTypes.length === 0) return query;

  let filtered = query as any;
  if (hiddenTypes.length === 1) {
    filtered = filtered.neq("type", hiddenTypes[0]);
  } else {
    const values = hiddenTypes.map((type) => `"${type}"`).join(",");
    filtered = filtered.not("type", "in", `(${values})`);
  }

  return filtered as TQuery;
}

function useNotificationsRealtimeInvalidation(userId: string | undefined, activeOrgId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidateNotifications = () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey(userId, activeOrgId) });
      queryClient.invalidateQueries({ queryKey: unreadNotificationsKey(userId, activeOrgId) });
    };

    const channel = supabase
      .channel(`notifications-${userId}-${activeOrgId ?? "personal"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        invalidateNotifications,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrgId, queryClient, userId]);
}

export function useNotifications() {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();

  const isOrganiserView = activeProfile?.type === "organiser";
  const activeOrgId = isOrganiserView ? activeProfile.id : null;
  const qk = notificationsKey(user?.id, activeOrgId);

  const query = useQuery({
    queryKey: qk,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select(notificationSelectFields)
        .eq("user_id", user!.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      q = applyNotificationScope(q, activeOrgId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AppNotification[];
    },
    enabled: !!user?.id,
  });

  useNotificationsRealtimeInvalidation(user?.id, activeOrgId);

  return query;
}

export function useUnreadCount() {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();

  const activeOrgId = activeProfile?.type === "organiser" ? activeProfile.id : null;
  const qk = unreadNotificationsKey(user?.id, activeOrgId);

  const query = useQuery({
    queryKey: qk,
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false)
        .gt("expires_at", new Date().toISOString());

      q = applyNotificationScope(q, activeOrgId);
      q = applyHiddenNotificationTypeFilter(q);

      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  useNotificationsRealtimeInvalidation(user?.id, activeOrgId);

  return query.data ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const activeOrgId = activeProfile?.type === "organiser" ? activeProfile.id : null;
  const qk = notificationsKey(user?.id, activeOrgId);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData<AppNotification[]>(qk);
      queryClient.setQueryData<AppNotification[]>(qk, (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(qk, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: unreadNotificationsKey(user?.id, activeOrgId) });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const activeOrgId = activeProfile?.type === "organiser" ? activeProfile.id : null;
  const qk = notificationsKey(user?.id, activeOrgId);

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      let q = supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      q = applyNotificationScope(q, activeOrgId);

      const { error } = await q;
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData<AppNotification[]>(qk);
      queryClient.setQueryData<AppNotification[]>(qk, (old) =>
        old?.map((n) => ({ ...n, read: true })),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(qk, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: unreadNotificationsKey(user?.id, activeOrgId) });
    },
  });
}
