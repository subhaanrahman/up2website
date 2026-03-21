import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';
import { connectionsParticipantOr } from '@/utils/postgrest-connection-filters';

export interface Friend {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export function useFriends(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", userId],
    queryFn: async (): Promise<Friend[]> => {
      if (!userId) return [];

      const { data: connections, error: connError } = await supabase
        .from("connections")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(connectionsParticipantOr(userId));

      if (connError) throw connError;
      if (!connections || connections.length === 0) return [];

      const friendIds = connections.map((c) =>
        c.requester_id === userId ? c.addressee_id : c.requester_id
      );

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", friendIds);

      if (profileError) throw profileError;

      return (profiles || []).map((p) => ({
        userId: p.user_id,
        displayName: p.display_name || "User",
        username: p.username || "user",
        avatarUrl: p.avatar_url,
      }));
    },
    enabled: !!userId,
  });
}
