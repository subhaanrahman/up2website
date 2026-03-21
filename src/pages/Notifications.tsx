import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PendingOrganiserInvites from "@/components/PendingOrganiserInvites";
import FriendRequestsSection from "@/components/FriendRequestsSection";
import NotificationItem from "@/components/notifications/NotificationItem";
import AppHeader from "@/components/AppHeader";
import VirtualizedStack from "@/components/VirtualizedStack";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import {
  useNotifications,
  useMarkAllRead,
  HIDDEN_NOTIFICATION_TYPES,
  type AppNotification,
} from "@/hooks/useNotificationsQuery";

function groupNotificationDate(createdAt: string): "Now" | "Today" | "Earlier" {
  const ts = new Date(createdAt).getTime();
  const now = Date.now();
  const ageMs = now - ts;
  if (ageMs <= 60 * 60 * 1000) return "Now";
  if (ageMs <= 24 * 60 * 60 * 1000) return "Today";
  return "Earlier";
}

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const activeOrgId = activeProfile?.type === "organiser" ? activeProfile.id : null;

  const [activeType, setActiveType] = useState<"all" | string>("all");

  const filtered = notifications.filter((n) => !HIDDEN_NOTIFICATION_TYPES.has(n.type));
  const visible = activeType === "all" ? filtered : filtered.filter((n) => n.type === activeType);
  const hasUnread = visible.some((n) => !n.read);
  const typeOptions = [
    { value: "all", label: "All" },
    ...Array.from(new Set(filtered.map((n) => n.type))).map((type) => ({
      value: type,
      label: type.replaceAll("_", " "),
    })),
  ];

  const markTypeRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || activeType === "all") return;
      let q = supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("type", activeType)
        .eq("read", false);
      if (activeOrgId) q = q.eq("organiser_profile_id", activeOrgId);
      else q = q.is("organiser_profile_id", null);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id, activeOrgId] }),
  });

  const grouped = visible.reduce<Record<"Now" | "Today" | "Earlier", AppNotification[]>>(
    (acc, item) => {
      acc[groupNotificationDate(item.created_at)].push(item);
      return acc;
    },
    { Now: [], Today: [], Earlier: [] },
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title="Notifications"
        onBack={() => navigate(-1)}
        rightSlot={
          hasUnread ? (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-10 w-10 rounded-full inline-flex items-center justify-center text-primary hover:text-primary/80 transition-colors"
              aria-label="Mark all as read"
            >
              <CheckCheck className="h-5 w-5" />
            </button>
          ) : null
        }
      />

      <main className="px-4 pt-2 space-y-4">
        <FriendRequestsSection />
        <PendingOrganiserInvites />
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setActiveType(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors capitalize ${
                activeType === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
          {activeType !== "all" && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => markTypeRead.mutate()}
              disabled={markTypeRead.isPending}
            >
              Mark type read
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card rounded-tile-sm animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium">All clear</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeType === "all" ? "No notifications yet" : "No notifications in this category"}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => navigate("/")}>Go to feed</Button>
              <Button size="sm" variant="secondary" onClick={() => setActiveType("all")}>Show all</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {(["Now", "Today", "Earlier"] as const).map((section) => {
              const rows = grouped[section];
              if (rows.length === 0) return null;
              return (
                <section key={section}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {section}
                  </p>
                  {rows.length > 24 ? (
                    <VirtualizedStack
                      items={rows}
                      itemHeight={102}
                      viewportHeight={420}
                      className="space-y-0"
                      renderItem={(notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                      )}
                    />
                  ) : (
                    <div className="space-y-2">
                      {rows.map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Notifications;
