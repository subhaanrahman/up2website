import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';

export interface UserEvent {
  id: string;
  title: string;
  eventDate: string;
  coverImage: string | null;
  location: string | null;
  category: string | null;
  status: string;
}

function mapRow(r: any): UserEvent {
  return {
    id: r.id,
    title: r.title,
    eventDate: r.event_date,
    coverImage: r.cover_image,
    location: r.location,
    category: r.category,
    status: r.status,
  };
}

/**
 * "My Plans" — events the user is attending via RSVP, ticket purchase, or saved.
 * Does NOT include events the user created (unless they also RSVP'd).
 */
export function useUserPlannedEvents(userId: string | undefined) {
  const { activeProfile } = useActiveProfile();
  const isOrganiser = activeProfile?.type === 'organiser';
  const profileId = activeProfile?.id;

  return useQuery({
    queryKey: ['user-planned-events', userId, profileId, isOrganiser],
    queryFn: async () => {
      if (!userId) return [];

      const [rsvpResult, orderResult, savedResult, cohostResult, hostedResult] = await Promise.all([
        supabase
          .from('rsvps')
          .select('event_id, status, events (id, title, event_date, cover_image, location, category, status)')
          .eq('user_id', userId)
          .in('status', ['going', 'interested', 'pending']),
        supabase
          .from('orders')
          .select('event_id, status, events:event_id (id, title, event_date, cover_image, location, category, status)')
          .eq('user_id', userId)
          .eq('status', 'confirmed'),
        supabase
          .from('saved_events')
          .select('event_id, events:event_id (id, title, event_date, cover_image, location, category, status)')
          .eq('user_id', userId),
        supabase.from('event_cohosts').select('event_id').eq('user_id', userId),
        profileId
          ? (isOrganiser
              ? supabase.from('events').select('id').eq('organiser_profile_id', profileId)
              : supabase.from('events').select('id').eq('host_id', userId))
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const seen = new Set<string>();
      const results: (UserEvent & { ticketStatus: string })[] = [];

      const purchasedIds = new Set((orderResult.data || []).map((o) => o.event_id));
      const excludedEventIds = new Set<string>([
        ...new Set((cohostResult.data || []).map((r: any) => r.event_id)),
        ...new Set((hostedResult.data || []).map((r: any) => r.id)),
      ]);

      // RSVPs first
      for (const r of rsvpResult.data || []) {
        if (excludedEventIds.has(r.event_id)) continue;
        if (seen.has(r.event_id)) continue;
        seen.add(r.event_id);
        const ev = r.events as any;
        if (!ev) continue;
        let ticketStatus = r.status === 'going' ? 'going' : r.status === 'pending' ? 'pending' : 'interested';
        if (purchasedIds.has(r.event_id)) ticketStatus = 'purchased';
        results.push({ ...mapRow(ev), ticketStatus });
      }

      // Purchased without RSVP
      for (const o of orderResult.data || []) {
        if (excludedEventIds.has(o.event_id)) continue;
        if (seen.has(o.event_id)) continue;
        seen.add(o.event_id);
        const ev = o.events as any;
        if (!ev) continue;
        results.push({ ...mapRow(ev), ticketStatus: 'purchased' });
      }

      // Saved without RSVP or purchase
      for (const s of savedResult.data || []) {
        if (excludedEventIds.has(s.event_id)) continue;
        if (seen.has(s.event_id)) continue;
        seen.add(s.event_id);
        const ev = s.events as any;
        if (!ev) continue;
        results.push({ ...mapRow(ev), ticketStatus: 'saved' });
      }

      return results;
    },
    enabled: !!userId,
  });
}

/**
 * "My Events" — events created by the active profile.
 * Personal profile: events where host_id = userId AND organiser_profile_id IS NULL.
 * Organiser profile: events where organiser_profile_id = activeProfileId.
 */
export function useUserCreatedEvents(userId: string | undefined) {
  const { activeProfile } = useActiveProfile();

  const isOrganiser = activeProfile?.type === 'organiser';
  const profileId = activeProfile?.id;

  return useQuery({
    queryKey: ['user-created-events', userId, profileId, isOrganiser],
    queryFn: async () => {
      if (!profileId) return [];

      let query = supabase
        .from('events')
        .select('id, title, event_date, cover_image, location, category, status')
        .order('event_date', { ascending: false });

      if (isOrganiser) {
        query = query.eq('organiser_profile_id', profileId);
      } else {
        // host_id references profiles.user_id (i.e. the auth user id).
        // Include both personal-hosted and organiser-hosted events.
        query = query.eq('host_id', userId as string);
      }

      const [createdResult, cohostResult] = await Promise.all([
        query,
        userId
          ? supabase.from('event_cohosts').select('event_id').eq('user_id', userId)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (createdResult.error) throw createdResult.error;
      if (cohostResult.error) throw cohostResult.error;

      const created = (createdResult.data || []).map(mapRow);
      const seen = new Set(created.map((e) => e.id));

      const cohostEventIds = [...new Set((cohostResult.data || []).map((r: any) => r.event_id))];
      let cohostEvents: UserEvent[] = [];
      if (cohostEventIds.length > 0) {
        const { data: cohostRows, error: cohostEventsError } = await supabase
          .from('events')
          .select('id, title, event_date, cover_image, location, category, status')
          .in('id', cohostEventIds);
        if (cohostEventsError) throw cohostEventsError;
        cohostEvents = (cohostRows || []).map(mapRow).filter((e) => !seen.has(e.id));
      }

      const merged = [...created, ...cohostEvents].sort(
        (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      );
      return merged;
    },
    enabled: !!userId && !!profileId,
  });
}
