import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  return useQuery({
    queryKey: ['user-planned-events', userId],
    queryFn: async () => {
      if (!userId) return [];

      const [rsvpResult, orderResult, savedResult, cohostResult] = await Promise.all([
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
        supabase
          .from('event_cohosts')
          .select('event_id')
          .eq('user_id', userId),
      ]);

      const seen = new Set<string>();
      const results: (UserEvent & { ticketStatus: string })[] = [];

      const purchasedIds = new Set((orderResult.data || []).map((o) => o.event_id));

      // Co-host event IDs: fetch event rows for merge
      const cohostEventIds = [...new Set((cohostResult.data || []).map((r) => r.event_id))];
      let cohostEvents: any[] = [];
      if (cohostEventIds.length > 0) {
        const { data: cohostEventRows } = await supabase
          .from('events')
          .select('id, title, event_date, cover_image, location, category, status')
          .in('id', cohostEventIds);
        cohostEvents = cohostEventRows || [];
      }

      // RSVPs first
      for (const r of rsvpResult.data || []) {
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
        if (seen.has(o.event_id)) continue;
        seen.add(o.event_id);
        const ev = o.events as any;
        if (!ev) continue;
        results.push({ ...mapRow(ev), ticketStatus: 'purchased' });
      }

      // Saved without RSVP or purchase
      for (const s of savedResult.data || []) {
        if (seen.has(s.event_id)) continue;
        seen.add(s.event_id);
        const ev = s.events as any;
        if (!ev) continue;
        results.push({ ...mapRow(ev), ticketStatus: 'saved' });
      }

      // Co-hosted events (not already in RSVP/order/saved)
      for (const ev of cohostEvents) {
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        results.push({ ...mapRow(ev), ticketStatus: 'cohost' });
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
    queryKey: ['user-created-events', profileId, isOrganiser],
    queryFn: async () => {
      if (!profileId) return [];

      let query = supabase
        .from('events')
        .select('id, title, event_date, cover_image, location, category, status')
        .order('event_date', { ascending: false });

      if (isOrganiser) {
        query = query.eq('organiser_profile_id', profileId);
      } else {
        query = query.eq('host_id', profileId).is('organiser_profile_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    enabled: !!userId && !!profileId,
  });
}
