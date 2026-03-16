import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, Users, Ticket, Heart, UserPlus, Star, Share2, Repeat2, Trophy, Trash2 } from "lucide-react";
import { useMarkNotificationRead, type AppNotification } from "@/hooks/useNotificationsQuery";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsRepository } from "@/features/notifications/repositories/notificationsRepository";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";

const iconMap: Record<string, typeof Bell> = {
  shared_event: Share2,
  shared_post: Share2,
  shared_account: Share2,
  post_from_following: Repeat2,
  post_reaction: Heart,
  post_repost: Repeat2,
  post: Bell,
  upcoming_event: Calendar,
  saved_reminder: Ticket,
  friend_activity: Users,
  friend_request: UserPlus,
  suggested_account: Star,
  gamification_levelup: Trophy,
  general: Bell,
};

const DISMISS_THRESHOLD = 80;

const NotificationItem = ({ notification }: { notification: AppNotification }) => {
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const activeOrgId = activeProfile?.type === "organiser" ? activeProfile.id : null;

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      await notificationsRepository.deleteNotification(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id, activeOrgId] }),
  });
  const Icon = iconMap[notification.type] || Bell;

  const startXRef = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientX - startXRef.current;
    if (delta < 0) setTranslateX(delta);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (translateX < -DISMISS_THRESHOLD) {
      if (itemRef.current) setHeight(itemRef.current.offsetHeight);
      setTranslateX(-window.innerWidth);
      setTimeout(() => {
        setDismissed(true);
        dismiss.mutate(notification.id);
      }, 220);
    } else {
      setTranslateX(0);
    }
  };

  const handleClick = () => {
    if (Math.abs(translateX) > 5) return;
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.link) {
      // Post notifications: navigate to home feed since there's no post detail page
      if (notification.link.startsWith("/post/")) {
        navigate("/");
      } else {
        navigate(notification.link);
      }
    }
  };

  const revealRatio = Math.min(1, Math.abs(translateX) / DISMISS_THRESHOLD);

  if (dismissed) return null;

  return (
    <div
      ref={itemRef}
      className="relative overflow-hidden rounded-xl"
      style={
        height !== undefined
          ? { height, transition: "height 0.25s ease, margin 0.25s ease", overflow: "hidden" }
          : undefined
      }
    >
      {/* Swipe-reveal delete background */}
      <div
        className="absolute inset-0 bg-destructive flex items-center justify-end pr-5 rounded-xl"
        style={{ opacity: revealRatio }}
      >
        <Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Notification content */}
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? "none" : "transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
        className={`flex gap-3 p-4 rounded-xl cursor-pointer ${
          notification.read ? "bg-card" : "bg-primary/5 border border-primary/20"
        }`}
      >
        {notification.avatar_url ? (
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={notification.avatar_url} />
            <AvatarFallback><Icon className="h-5 w-5" /></AvatarFallback>
          </Avatar>
        ) : notification.event_image ? (
          <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
            <img src={notification.event_image} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-foreground text-sm">{notification.title}</p>
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
