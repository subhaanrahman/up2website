import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ban } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const BlockedUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: blockedUsers = [], isLoading } = useQuery<BlockedUser[]>({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const profileIds = (data || []).map((b) => b.blocked_id);
      if (profileIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", profileIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return (data || []).map((b) => ({
        ...b,
        profile: profileMap.get(b.blocked_id) || null,
      }));
    },
    enabled: !!user,
  });

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["blocked-users", user.id] });
      queryClient.invalidateQueries({ queryKey: ["feed-context"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "User unblocked" });
    } catch {
      toast({ title: "Failed to unblock", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 mr-2">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Blocked Users</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        <p className="text-muted-foreground text-sm mb-6">
          Blocked users cannot see your profile or interact with you.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-xl">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1.5" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
              <Ban className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No blocked users</p>
            <p className="text-sm text-muted-foreground">
              Users you block will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((item) => {
              const name = item.profile?.display_name || item.profile?.username || "Unknown";
              const username = item.profile?.username;
              const avatar = item.profile?.avatar_url;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-4 bg-card rounded-xl"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={avatar || ""} />
                    <AvatarFallback className="bg-secondary text-foreground font-bold text-sm">
                      {name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{name}</p>
                    {username && (
                      <p className="text-sm text-muted-foreground truncate">@{username}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs shrink-0"
                    onClick={() => handleUnblock(item.blocked_id)}
                  >
                    Unblock
                  </Button>
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

export default BlockedUsers;
