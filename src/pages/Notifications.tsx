import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PendingOrganiserInvites from "@/components/PendingOrganiserInvites";
import FriendRequestsSection from "@/components/FriendRequestsSection";
import NotificationItem from "@/components/notifications/NotificationItem";
import {
  useNotifications,
  useMarkAllRead,
  HIDDEN_NOTIFICATION_TYPES,
} from "@/hooks/useNotificationsQuery";

const Notifications = () => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();

  const filtered = notifications.filter((n) => !HIDDEN_NOTIFICATION_TYPES.has(n.type));
  const hasUnread = filtered.some((n) => !n.read);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <h1 className="text-2xl font-bold text-foreground text-center">NOTIFICATIONS</h1>
          <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          {hasUnread && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="absolute right-3 p-2 text-primary hover:text-primary/80 transition-colors"
              aria-label="Mark all as read"
            >
              <CheckCheck className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <main className="px-4 pt-2 space-y-4">
        <FriendRequestsSection />
        <PendingOrganiserInvites />
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Notifications;
