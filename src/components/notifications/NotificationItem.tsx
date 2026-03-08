import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, Users, Ticket, Heart, UserPlus, Star, Share2, Repeat2, Trophy } from "lucide-react";
import { useMarkNotificationRead, type AppNotification } from "@/hooks/useNotificationsQuery";
import { useNavigate } from "react-router-dom";

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

const NotificationItem = ({ notification }: { notification: AppNotification }) => {
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();
  const Icon = iconMap[notification.type] || Bell;

  const handleClick = () => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`flex gap-3 p-4 rounded-xl transition-colors cursor-pointer ${
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
  );
};

export default NotificationItem;
