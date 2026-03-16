// P-06 & P-19: Hook to get friends going to an event
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface FriendGoing {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export function useFriendsGoing(eventId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends-going', eventId, user?.id],
    queryFn: async (): Promise<FriendGoing[]> => {
      if (!user || !eventId) return [];

      // Get user's accepted connections
      const { data: connections } = await supabase
        .from('connections')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!connections || connections.length === 0) return [];

      const friendIds = connections.map(c =>
        c.requester_id === user.id ? c.addressee_id : c.requester_id
      );

      // Get RSVPs for this event from friends
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'going')
        .in('user_id', friendIds);

      if (!rsvps || rsvps.length === 0) return [];

      const goingFriendIds = rsvps.map(r => r.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', goingFriendIds);

      return (profiles || []).map(p => ({
        userId: p.user_id,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
      }));
    },
    enabled: !!user && !!eventId,
  });
}
