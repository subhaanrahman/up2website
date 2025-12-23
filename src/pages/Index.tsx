import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Plus, 
  Heart, 
  Repeat2, 
  MoreHorizontal, 
  BadgeCheck
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { events } from "@/data/events";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@/assets/logo.png";

// Mock feed data for social posts
const feedPosts = [
  {
    id: "1",
    type: "text",
    user: {
      name: "Sarah Chen",
      handle: "sarahchen123",
      avatar: "",
      verified: false,
    },
    content: "If you're reading this, you still have time to pull up 🔥 The party everyone's talking about goes down TONIGHT... don't be the one hearing about it tomorrow 👀",
    time: "36m",
    likes: 142,
    reposts: 32,
  },
  {
    id: "2",
    type: "event",
    user: {
      name: "NOIR",
      handle: "noirsydney",
      avatar: "",
      verified: true,
    },
    action: "posted an event",
    time: "7 hrs",
    likes: 142,
    reposts: 32,
    event: events[0],
  },
];

const Index = () => {
  const { user } = useAuth();
  const nearbyEvents = events.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-center px-4 h-14 relative">
          {/* Logo - Centered */}
          <img src={logoImg} alt="Up2" className="h-8 w-auto" />
          
          {/* Notification Bell */}
          <div className="absolute right-4">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-secondary">
              <Bell className="h-5 w-5 text-foreground" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Post Composer */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="" />
              <AvatarFallback className="bg-card text-foreground font-bold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-foreground">
                  {user?.email?.split("@")[0] || "Guest"}
                </span>
                <BadgeCheck className="h-4 w-4 text-primary fill-primary" />
                <span className="text-muted-foreground text-sm">
                  @{user?.email?.split("@")[0]?.toLowerCase() || "guest"}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">Write Something...</p>
            </div>
          </div>
        </div>

        {/* Events Near You - Vertical Tiles */}
        <div className="border-b border-border">
          <div className="px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">Events Near You</h2>
          </div>
          
          <div className="px-4 pb-4 flex flex-col gap-3">
            {nearbyEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="w-28 h-28 flex-shrink-0 overflow-hidden bg-muted">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                  <p className="text-sm text-muted-foreground">{event.location?.split(",")[0] || "Venue"}</p>
                  <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.date} - {event.time}</p>
                  <p className="text-sm text-muted-foreground">From $49.99</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Social Feed */}
        <div>
          {feedPosts.map((post) => (
            <div key={post.id} className="px-4 py-4 border-b border-border">
              <div className="flex gap-3">
                {/* Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback className="bg-card text-foreground font-bold">
                    {post.user.name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* User Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground">{post.user.name}</span>
                      {post.user.verified && (
                        <BadgeCheck className="h-4 w-4 text-primary fill-primary" />
                      )}
                      {post.type === "event" && (
                        <span className="text-muted-foreground text-sm">{post.action}</span>
                      )}
                      <span className="text-muted-foreground text-sm">
                        {post.type === "text" && `@${post.user.handle}`} • {post.time}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Content */}
                  {post.type === "text" && (
                    <p className="text-foreground mt-1 leading-relaxed">{post.content}</p>
                  )}

                  {/* Event Card */}
                  {post.type === "event" && post.event && (
                    <Link
                      to={`/events/${post.event.id}`}
                      className="mt-3 flex bg-card rounded-xl overflow-hidden border border-border"
                    >
                      <div className="w-32 h-28 flex-shrink-0 bg-muted">
                        <img
                          src={post.event.image}
                          alt={post.event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-3 min-w-0">
                        <p className="text-sm text-muted-foreground">{post.event.location?.split(",")[0] || "Venue"}</p>
                        <h3 className="font-semibold text-foreground truncate">{post.event.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {post.event.date} - {post.event.time}
                        </p>
                        <p className="text-sm text-muted-foreground">From $49.99</p>
                      </div>
                    </Link>
                  )}

                  {/* Engagement */}
                  <div className="flex items-center gap-6 mt-3">
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                      <Repeat2 className="h-4 w-4" />
                      <span className="text-sm">{post.reposts}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Action Button */}
      <Link
        to="/create"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-7 w-7 text-primary-foreground" />
      </Link>

      <BottomNav />
    </div>
  );
};

export default Index;