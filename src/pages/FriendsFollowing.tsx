import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/infrastructure/supabase';

interface FriendItem {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface FollowingItem {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

const FriendsFollowing = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch accepted connections (friends)
      const { data: connections } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (connections && connections.length > 0) {
        const friendIds = connections.map((c) =>
          c.requester_id === user.id ? c.addressee_id : c.requester_id
        );
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", friendIds);

        setFriends(
          (profiles || []).map((p) => ({
            userId: p.user_id,
            displayName: p.display_name || "User",
            username: p.username || "user",
            avatarUrl: p.avatar_url,
          }))
        );
      } else {
        setFriends([]);
      }

      // Fetch organiser follows
      const { data: follows } = await supabase
        .from("organiser_followers")
        .select("organiser_profile_id")
        .eq("user_id", user.id);

      if (follows && follows.length > 0) {
        const orgIds = follows.map((f) => f.organiser_profile_id);
        const { data: orgs } = await supabase
          .from("organiser_profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", orgIds);

        setFollowing(
          (orgs || []).map((o) => ({
            id: o.id,
            displayName: o.display_name,
            username: o.username,
            avatarUrl: o.avatar_url,
          }))
        );
      } else {
        setFollowing([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-foreground">Friends & Following</span>
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto">
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full h-auto p-0 bg-transparent border-b border-border rounded-none">
            <TabsTrigger
              value="friends"
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              FRIENDS ({friends.length})
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="flex-1 py-3 rounded-none bg-transparent text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground"
            >
              FOLLOWING ({following.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-2">
            {loading ? (
              <LoadingSpinner message="Loading friends..." />
            ) : friends.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No friends yet</div>
            ) : (
              <div className="divide-y divide-border">
                {friends.map((f) => (
                  <Link
                    key={f.userId}
                    to={`/user/${f.userId}`}
                    className="flex items-center gap-3 py-3 hover:bg-secondary/30 transition-colors rounded-lg px-2"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={f.avatarUrl || undefined} />
                      <AvatarFallback className="bg-card text-foreground font-semibold">
                        {f.displayName[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{f.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{f.username}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-2">
            {loading ? (
              <LoadingSpinner message="Loading following..." />
            ) : following.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Not following anyone yet</div>
            ) : (
              <div className="divide-y divide-border">
                {following.map((f) => (
                  <Link
                    key={f.id}
                    to={`/user/${f.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-secondary/30 transition-colors rounded-lg px-2"
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={f.avatarUrl || undefined} />
                      <AvatarFallback className="bg-card text-foreground font-semibold">
                        {f.displayName[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{f.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{f.username}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default FriendsFollowing;
