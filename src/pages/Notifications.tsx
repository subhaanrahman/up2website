import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users, Ticket, Heart, UserPlus, Star, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import BottomNav from "@/components/BottomNav";

type NotificationType = 
  | "shared_event" 
  | "post" 
  | "upcoming_event" 
  | "saved_reminder" 
  | "friend_activity" 
  | "friend_request"
  | "suggested_account";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  avatar?: string;
  eventImage?: string;
}

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "friend_activity",
    title: "Alex is going!",
    message: "Your friend Alex just RSVP'd to Summer Rooftop Party",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  },
  {
    id: "2",
    type: "upcoming_event",
    title: "Event Tomorrow!",
    message: "Don't forget - Neon Nights is happening tomorrow at 9PM",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    eventImage: "/src/assets/event-rooftop.jpg",
  },
  {
    id: "3",
    type: "shared_event",
    title: "Sarah shared an event",
    message: "Check out this event Sarah thinks you'd love",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  },
  {
    id: "4",
    type: "friend_request",
    title: "New friend request",
    message: "Jordan wants to connect with you",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    read: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
  },
  {
    id: "5",
    type: "saved_reminder",
    title: "Don't miss out!",
    message: "You saved Beach Bonfire 3 days ago. Tickets are selling fast!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    eventImage: "/src/assets/event-dinner.jpg",
  },
  {
    id: "6",
    type: "suggested_account",
    title: "Suggested for you",
    message: "Based on your interests, you might like following DJ Pulse",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DJPulse",
  },
  {
    id: "7",
    type: "friend_activity",
    title: "Mike moved to Silver!",
    message: "Your friend just reached Silver tier - catch up!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    read: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
  },
];

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "shared_event":
      return Heart;
    case "post":
      return Bell;
    case "upcoming_event":
      return Calendar;
    case "saved_reminder":
      return Ticket;
    case "friend_activity":
      return Users;
    case "friend_request":
      return UserPlus;
    case "suggested_account":
      return Star;
    default:
      return Bell;
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {unreadCount} new
            </span>
          )}
        </div>
      </header>

      <main className="px-4 pt-2">
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              
              return (
                <div
                  key={notification.id}
                  className={`flex gap-3 p-4 rounded-xl transition-colors ${
                    notification.read ? "bg-card" : "bg-primary/5 border border-primary/20"
                  }`}
                >
                  {/* Avatar or Event Image */}
                  {notification.avatar ? (
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={notification.avatar} />
                      <AvatarFallback>
                        <Icon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  ) : notification.eventImage ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                      <img
                        src={notification.eventImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
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
