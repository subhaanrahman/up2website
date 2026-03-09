import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import PendingOrganiserInvites from "@/components/PendingOrganiserInvites";
import FriendRequestsSection from "@/components/FriendRequestsSection";
import NotificationItem from "@/components/notifications/NotificationItem";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllRead,
} from "@/hooks/useNotificationsQuery";

const Notifications = () => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const unreadCount = useUnreadCount();
  const markAllRead = useMarkAllRead();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 py-4 relative">
          <h1 className="text-2xl font-bold text-foreground text-center">NOTIFICATIONS</h1>
          <button onClick={() => navigate(-1)} className="absolute left-2 p-2 -ml-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 gap-1 text-xs text-muted-foreground"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <main className="px-4 pt-2 space-y-4">
        {/* Friend Requests — always at top, queries pending connections regardless of notification expiry */}
        <FriendRequestsSection />
        <PendingOrganiserInvites />
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
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
