// Events repository — DB access (reads only on client, writes via Edge Functions)

import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('events.repository');
import { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { EventEntity, Rsvp } from '../domain/types';

export type EventFilter = 'all' | 'tonight' | 'thisWeek' | 'thisMonth' | 'free';

function mapEventRow(row: Record<string, unknown>): EventEntity {
  return {
    id: row.id as string,
    hostId: row.host_id as string,
    title: row.title as string,
    description: row.description as string | null,
    location: row.location as string | null,
    venueName: (row.venue_name as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    eventDate: row.event_date as string,
    endDate: row.end_date as string | null,
    coverImage: row.cover_image as string | null,
    category: row.category as string | null,
    maxGuests: row.max_guests as number | null,
    isPublic: row.is_public as boolean,
    ticketsAvailableFrom: (row.tickets_available_from as string) ?? null,
    ticketsAvailableUntil: (row.tickets_available_until as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const eventsRepository = {
  async list(options?: { limit?: number }): Promise<EventEntity[]> {
    const now = new Date().toISOString();
    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .order('event_date', { ascending: true });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapEventRow);
  },

  async search(options: { query?: string; filter?: EventFilter; city?: string; limit?: number }): Promise<EventEntity[]> {
    const now = new Date();

    // For "free" filter we need to join ticket_tiers; otherwise plain events query
    if (options.filter === 'free') {
      return this._searchFreeEvents(options);
    }

    const nowIso = now.toISOString();
    let q = supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .gte('event_date', nowIso)
      .order('event_date', { ascending: true });

    if (options.query?.trim()) {
      const term = `%${options.query.trim()}%`;
      q = q.or(`title.ilike.${term},location.ilike.${term},venue_name.ilike.${term},address.ilike.${term}`);
    }

    if (options.city) {
      q = q.or(`location.ilike.%${options.city}%,address.ilike.%${options.city}%`);
    }

    // Date-range filters
    if (options.filter === 'tonight') {
      q = q.gte('event_date', startOfToday().toISOString()).lte('event_date', endOfToday().toISOString());
    } else if (options.filter === 'thisWeek') {
      q = q.gte('event_date', startOfToday().toISOString()).lte('event_date', endOfWeek(now, { weekStartsOn: 1 }).toISOString());
    } else if (options.filter === 'thisMonth') {
      q = q.gte('event_date', startOfToday().toISOString()).lte('event_date', endOfMonth(now).toISOString());
    }

    if (options.limit) {
      q = q.limit(options.limit);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapEventRow);
  },

  async _searchFreeEvents(options: { query?: string; limit?: number }): Promise<EventEntity[]> {
    const now = new Date().toISOString();
    // Free = ticket_price_cents is 0 AND no paid ticket tiers; only published, past publish_at
    let q = supabase
      .from('events')
      .select('*, ticket_tiers!left(price_cents)')
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .gte('event_date', now)
      .eq('ticket_price_cents', 0)
      .order('event_date', { ascending: true });

    if (options.query?.trim()) {
      const term = `%${options.query.trim()}%`;
      q = q.or(`title.ilike.${term},location.ilike.${term}`);
    }
    if (options.limit) {
      q = q.limit(options.limit);
    }

    const { data, error } = await q;
    if (error) throw error;

    // Filter out events that have any paid ticket tier
    const freeEvents = (data || []).filter((row: any) => {
      const tiers = row.ticket_tiers || [];
      return tiers.every((t: any) => t.price_cents === 0);
    });

    return freeEvents.map(mapEventRow);
  },

  async getById(id: string): Promise<EventEntity | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapEventRow(data) : null;
  },

  async getByHost(hostId: string): Promise<EventEntity[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('host_id', hostId)
      .is('organiser_profile_id', null)
      .order('event_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapEventRow);
  },

  async getRsvps(eventId: string): Promise<Rsvp[]> {
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id,
      eventId: r.event_id,
      userId: r.user_id,
      status: r.status,
      createdAt: r.created_at,
    }));
  },

  async getUserRsvp(eventId: string, userId: string): Promise<Rsvp | null> {
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      eventId: data.event_id,
      userId: data.user_id,
      status: data.status,
      createdAt: data.created_at,
    };
  },

  async getUpcomingEventsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('id', ids)
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .gte('event_date', now);
    if (error) throw error;
    return (data || []).map(mapEventRow);
  },

  async getUpcomingEventsByOrganiserIds(organiserIds: string[], limit = 20) {
    if (organiserIds.length === 0) return [];
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .in('organiser_profile_id', organiserIds)
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapEventRow);
  },

  async getUserRsvpEventIds(userId: string) {
    const { data, error } = await supabase
      .from('rsvps')
      .select('event_id')
      .eq('user_id', userId)
      .eq('status', 'going');
    if (error) throw error;
    return (data || []).map((r: any) => r.event_id);
  },

  async getEventIdsByGoingUserIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    const { data, error } = await supabase
      .from('rsvps')
      .select('event_id')
      .in('user_id', userIds)
      .eq('status', 'going');
    if (error) throw error;
    return [...new Set((data || []).map((r: any) => r.event_id))];
  },

  async getNearbyEvents(city: string | null, limit = 4) {
    const now = new Date().toISOString();
    let query = supabase
      .from('events')
      .select('id, title, event_date, location, venue_name, address, cover_image, category, ticket_price_cents, host_id, organiser_profile_id')
      .eq('is_public', true)
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(limit);
    if (city) {
      query = query.or(`location.ilike.%${city}%,address.ilike.%${city}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (city && (data || []).length < 2) {
      const { data: backfill } = await supabase
        .from('events')
        .select('id, title, event_date, location, venue_name, address, cover_image, category, ticket_price_cents, host_id, organiser_profile_id')
        .eq('is_public', true)
        .eq('status', 'published')
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .gte('event_date', now)
        .order('event_date', { ascending: true })
        .limit(limit);
      const existing = new Set((data || []).map((e: any) => e.id));
      const merged = [...(data || []), ...(backfill || []).filter((e: any) => !existing.has(e.id))];
      return merged.slice(0, limit);
    }
    return data || [];
  },

  async getEventSummariesByIds(ids: string[], publicOnly = false) {
    if (ids.length === 0) return [];
    let query = supabase
      .from('events')
      .select('id, title, event_date, location, venue_name, address, cover_image')
      .in('id', ids);
    if (publicOnly) {
      const now = new Date().toISOString();
      query = query.eq('status', 'published').or(`publish_at.is.null,publish_at.lte.${now}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getSavedEventIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('saved_events')
      .select('event_id')
      .eq('user_id', userId);
    if (error) throw error;
    return new Set((data || []).map(d => d.event_id));
  },

  async saveEvent(userId: string, eventId: string) {
    log.info('saveEvent', { userId, eventId });
    const { error } = await supabase
      .from('saved_events')
      .insert({ user_id: userId, event_id: eventId });
    if (error) throw error;
  },

  async unsaveEvent(userId: string, eventId: string) {
    log.info('unsaveEvent', { userId, eventId });
    const { error } = await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    if (error) throw error;
  },

  async isEventSaved(eventId: string, userId: string) {
    const { data, error } = await supabase
      .from('saved_events')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getGoingUserIds(eventId: string, limit?: number) {
    let query = supabase
      .from('rsvps')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'going');
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(r => r.user_id);
  },

  async getUserRsvpStatus(eventId: string, userId: string) {
    const { data, error } = await supabase
      .from('rsvps')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
