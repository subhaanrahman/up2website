import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, MessageSquare, User, Ticket, LayoutDashboard, Plus, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useContext } from "react";
import { useProfile } from "@/hooks/useProfileQuery";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoImg from "@/assets/logo.png";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

// Import context directly to avoid the throwing hook when provider isn't mounted yet
import { ActiveProfileContext } from "@/contexts/ActiveProfileContext";

const DesktopSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const activeProfileCtx = useContext(ActiveProfileContext);
  const isOrganiser = activeProfileCtx?.isOrganiser ?? false;
  const { data: profile } = useProfile(user?.id);
  const { totalUnread } = useUnreadMessages();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: isOrganiser ? LayoutDashboard : Ticket, label: isOrganiser ? "Dashboard" : "Events", path: "/events" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const displayName = profile?.displayName || user?.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatarUrl || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="hidden md:flex flex-col justify-between fixed left-0 top-0 h-screen w-[72px] xl:w-[240px] border-r border-border bg-background z-50 py-6 px-2 xl:px-4">
      {/* Logo */}
      <div className="flex flex-col gap-2">
        <Link to="/" className="flex items-center justify-center xl:justify-start gap-2 mb-6 px-2">
          <img src={logoImg} alt="Up2" className="h-8 w-8 object-contain" />
        </Link>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-3 py-3 rounded-xl transition-colors group",
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className={cn("h-6 w-6 flex-shrink-0", isActive && "stroke-[2.5px]")} />
                <span className="hidden xl:block text-sm font-medium tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Create Button */}
        <Link
          to="/create"
          className="flex items-center justify-center xl:justify-start gap-4 px-3 py-3 mt-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-6 w-6 flex-shrink-0" />
          <span className="hidden xl:block text-sm font-bold uppercase tracking-wider">Create</span>
        </Link>
      </div>

      {/* Bottom section - Profile & Sign out */}
      <div className="flex flex-col gap-2">
        {user && (
          <>
            <Link
              to="/profile"
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                  {displayName[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden xl:block min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{profile?.username || "user"}</p>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 px-3 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="hidden xl:block text-sm">Sign Out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
};

export default DesktopSidebar;
