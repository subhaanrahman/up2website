import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import { supabase } from "@/infrastructure/supabase";

interface FollowerItem {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

const Followers = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeProfile, isOrganiser } = useActiveProfile();
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !isOrganiser || !activeProfile?.id) {
      setLoading(false);
      return;
    }

    const fetchFollowers = async () => {
      setLoading(true);

      const { data: follows } = await supabase
        .from("organiser_followers")
        .select("user_id")
        .eq("organiser_profile_id", activeProfile.id);

      if (!follows || follows.length === 0) {
        setFollowers([]);
        setLoading(false);
        return;
      }

      const userIds = follows.map((f) => f.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      setFollowers(
        (profiles || []).map((p) => ({
          userId: p.user_id,
          displayName: p.display_name || "User",
          username: p.username || "user",
          avatarUrl: p.avatar_url,
        }))
      );
      setLoading(false);
    };

    fetchFollowers();
  }, [user, isOrganiser, activeProfile?.id]);

  // Redirect to profile if not in organiser mode (e.g. direct URL access)
  useEffect(() => {
    if (!authLoading && user && !isOrganiser) {
      navigate("/profile");
    }
  }, [authLoading, user, isOrganiser, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isOrganiser) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background px-4 py-3 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-foreground">Followers</span>
      </header>

      <main className="px-4 pt-4 max-w-lg mx-auto">
        {loading ? (
          <LoadingSpinner message="Loading followers..." />
        ) : followers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No followers yet</div>
        ) : (
          <div className="divide-y divide-border">
            {followers.map((f) => (
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
      </main>

      <BottomNav />
    </div>
  );
};

export default Followers;
