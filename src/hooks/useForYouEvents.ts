import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfileQuery';
import type { EventEntity } from '@/features/events';

function mapRow(row: Record<string, unknown>): EventEntity {
  return {
    id: row.id as string,
    hostId: row.host_id as string,
    title: row.title as string,
    description: row.description as string | null,
    location: row.location as string | null,
    eventDate: row.event_date as string,
    endDate: row.end_date as string | null,
    coverImage: row.cover_image as string | null,
    category: row.category as string | null,
    maxGuests: row.max_guests as number | null,
    isPublic: row.is_public as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * "For You" recommendations based on:
 * 1. Events in user's city
 * 2. Events friends are attending
 * 3. Events from followed organisers
 * 4. Categories the user has attended before
 */
export function useForYouEvents(limit = 15) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  return useQuery({
    queryKey: ['for-you-events', user?.id, profile?.city],
    queryFn: async () => {
      const now = new Date().toISOString();
      const scored = new Map<string, { event: EventEntity; score: number }>();

      const addEvents = (events: EventEntity[], baseScore: number) => {
        for (const e of events) {
          const existing = scored.get(e.id);
          if (existing) {
            existing.score += baseScore;
          } else {
            scored.set(e.id, { event: e, score: baseScore });
          }
        }
      };

      // 1. City-based events
      if (profile?.city) {
        const { data } = await supabase
          .from('events')
          .select('*')
          .ilike('location', `%${profile.city}%`)
          .gte('event_date', now)
          .order('event_date', { ascending: true })
          .limit(20);
        if (data) addEvents(data.map(mapRow), 10);
      }

      // 2. Events friends are attending
      if (user) {
        const { data: connections } = await supabase
          .from('connections')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (connections && connections.length > 0) {
          const friendIds = connections.map(c =>
            c.requester_id === user.id ? c.addressee_id : c.requester_id
          );
          const { data: friendRsvps } = await supabase
            .from('rsvps')
            .select('event_id')
            .in('user_id', friendIds.slice(0, 20))
            .eq('status', 'going');

          if (friendRsvps && friendRsvps.length > 0) {
            const eventIds = [...new Set(friendRsvps.map(r => r.event_id))];
            const { data: events } = await supabase
              .from('events')
              .select('*')
              .in('id', eventIds.slice(0, 20))
              .gte('event_date', now);
            if (events) addEvents(events.map(mapRow), 15);
          }
        }
      }

      // 3. Events from followed organisers
      if (user) {
        const { data: follows } = await supabase
          .from('organiser_followers')
          .select('organiser_profile_id')
          .eq('user_id', user.id);

        if (follows && follows.length > 0) {
          const orgIds = follows.map(f => f.organiser_profile_id);
          const { data: events } = await supabase
            .from('events')
            .select('*')
            .in('organiser_profile_id', orgIds.slice(0, 20))
            .gte('event_date', now);
          if (events) addEvents(events.map(mapRow), 20);
        }
      }

      // 4. Backfill with upcoming events if not enough
      if (scored.size < limit) {
        const { data } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', now)
          .order('event_date', { ascending: true })
          .limit(limit);
        if (data) addEvents(data.map(mapRow), 1);
      }

      // Sort by score desc, then by event date
      return [...scored.values()]
        .sort((a, b) => b.score - a.score || new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime())
        .slice(0, limit)
        .map(s => s.event);
    },
    enabled: !!user,
  });
}
