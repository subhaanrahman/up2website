import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, MessageSquare, User, Ticket, LayoutDashboard, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfileQuery";


const LONG_PRESS_MS = 500;

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { activeProfile, switchProfile, organiserProfiles, isOrganiser } = useActiveProfile();
  const { data: personalProfile } = useProfile(user?.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: isOrganiser ? LayoutDashboard : Ticket, label: isOrganiser ? "Dashboard" : "Events", path: "/events" },
    { icon: MessageSquare, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const startPress = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      setSheetOpen(true);
    }, LONG_PRESS_MS);
  }, []);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleProfileClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (didLongPress.current) {
        e.preventDefault();
      }
    },
    []
  );

  const handleSignOut = async () => {
    setSheetOpen(false);
    await signOut();
    navigate("/");
  };

  const handleCreateOrganiser = () => {
    setSheetOpen(false);
    navigate("/profile/create-organiser");
  };

  const handleSwitchProfile = (id: string, type: "personal" | "organiser") => {
    switchProfile(id, type);
    setSheetOpen(false);
    navigate("/profile");
  };

  const personalDisplayName = personalProfile?.displayName || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Personal";
  const personalAvatarUrl = personalProfile?.avatarUrl || null;

  return (
    <>
      <nav className="no-press fixed bottom-0 z-50 bg-background/80 backdrop-blur-md border-t border-border w-full md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isProfile = item.label === "Profile";

            if (isProfile) {
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={handleProfileClick}
                  onTouchStart={startPress}
                  onTouchEnd={endPress}
                  onTouchCancel={endPress}
                  onMouseDown={startPress}
                  onMouseUp={endPress}
                  onMouseLeave={endPress}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full transition-colors select-none",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                </Link>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Account Switcher Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">Accounts</SheetTitle>
          </SheetHeader>

          {/* Personal account */}
          {user && (
            <button
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl mb-2 w-full text-left transition-colors",
                activeProfile?.type === "personal" ? "bg-secondary/50" : "hover:bg-secondary/30"
              )}
              onClick={() => handleSwitchProfile(user.id, "personal")}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={personalAvatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {personalDisplayName[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {personalDisplayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">Personal</p>
              </div>
              {activeProfile?.type === "personal" && (
                <span className="text-xs text-primary font-medium">Active</span>
              )}
            </button>
          )}

          {/* Organiser profiles */}
          {organiserProfiles.map((org) => (
            <button
              key={org.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl mb-2 w-full text-left transition-colors",
                activeProfile?.id === org.id ? "bg-secondary/50" : "hover:bg-secondary/30"
              )}
              onClick={() => handleSwitchProfile(org.id, "organiser")}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={org.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {org.displayName[0]?.toUpperCase() || "O"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {org.displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{org.category}</p>
              </div>
              {activeProfile?.id === org.id && (
                <span className="text-xs text-primary font-medium">Active</span>
              )}
            </button>
          ))}

          {/* Actions */}
          <div className="space-y-1 mt-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-foreground"
              onClick={handleCreateOrganiser}
            >
              <Plus className="h-5 w-5" />
              Create Organiser Page
            </Button>

            {user && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
