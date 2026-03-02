import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, MessageSquare, User, Ticket, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Ticket, label: "Events", path: "/events" },
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: User, label: "Profile", path: "/profile" },
];

const LONG_PRESS_MS = 500;

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

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

  const handleAddAccount = () => {
    setSheetOpen(false);
    navigate("/auth");
  };

  return (
    <>
      <nav className="fixed bottom-0 z-50 bg-background/80 backdrop-blur-md border-t border-border w-full md:w-[var(--phone-width)] md:left-[var(--phone-left)]">
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

          {/* Current account */}
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user.email?.[0]?.toUpperCase() || user.phone?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {user.user_metadata?.display_name || user.email?.split("@")[0] || user.phone}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email || user.phone}
                </p>
              </div>
              <span className="text-xs text-primary font-medium">Active</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-foreground"
              onClick={handleAddAccount}
            >
              <Plus className="h-5 w-5" />
              Add Account
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
