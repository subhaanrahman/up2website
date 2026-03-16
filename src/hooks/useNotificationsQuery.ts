import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';
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

function notificationsKey(userId: string | undefined, activeOrgId: string | null) {
  return ["notifications", userId, activeOrgId] as const;
}

export function useNotifications() {
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const queryClient = useQueryClient();

  const isOrganiserView = activeProfile?.type === "organiser";
  const activeOrgId = isOrganiserView ? activeProfile.id : null;
  const qk = notificationsKey(user?.id, activeOrgId);

  const query = useQuery({
    queryKey: qk,
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (isOrganiserView && activeOrgId) {
        q = q.eq("organiser_profile_id", activeOrgId);
      } else {
        q = q.is("organiser_profile_id", null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AppNotification[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}-${activeOrgId ?? "personal"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: qk })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, activeOrgId, queryClient, qk]);

  return query;
}

export function useUnreadCount() {
  const { data: notifications } = useNotifications();
  return (
    notifications?.filter(
      (n) => !n.read && !HIDDEN_NOTIFICATION_TYPES.has(n.type),
    ).length ?? 0
  );
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk }),
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

      if (activeOrgId) {
        q = q.eq("organiser_profile_id", activeOrgId);
      } else {
        q = q.is("organiser_profile_id", null);
      }

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
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk }),
  });
}
