import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/infrastructure/supabase';

interface MutualFriend {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export default function MutualFriendsRow({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const [mutuals, setMutuals] = useState<MutualFriend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) {
      setLoading(false);
      return;
    }

    const fetchMutuals = async () => {
      const { data, error } = await (supabase.rpc as any)("get_mutual_friends", {
        p_user_a: user.id,
        p_user_b: targetUserId,
      });

      if (!error && data) {
        setMutuals(data as MutualFriend[]);
      }
      setLoading(false);
    };

    fetchMutuals();
  }, [user, targetUserId]);

  if (loading || mutuals.length === 0) return null;

  // Show max 3 avatars, then "and X others"
  const shown = mutuals.slice(0, 3);
  const remaining = mutuals.length - shown.length;

  return (
    <div className="flex items-center gap-2 mb-5 justify-center">
      <div className="flex -space-x-2">
        {shown.map((f) => (
          <Link key={f.user_id} to={`/user/${f.user_id}`}>
            <Avatar className="h-7 w-7 border-2 border-background">
              <AvatarImage src={f.avatar_url || undefined} surface="mutual-friends-row" />
              <AvatarFallback className="bg-secondary text-foreground text-[10px] font-semibold">
                {f.display_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Followed by{" "}
        {shown.map((f, i) => (
          <span key={f.user_id}>
            <Link to={`/user/${f.user_id}`} className="font-semibold text-foreground">
              {f.display_name || f.username}
            </Link>
            {i < shown.length - 1 ? ", " : ""}
          </span>
        ))}
        {remaining > 0 && (
          <span>
            {" "}and <span className="font-semibold text-foreground">{remaining} others</span>
          </span>
        )}
      </p>
    </div>
  );
}
