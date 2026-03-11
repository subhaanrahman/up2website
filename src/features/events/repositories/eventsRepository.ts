// Events repository — DB access (reads only on client, writes via Edge Functions)

import { supabase } from '@/infrastructure/supabase';
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
    eventDate: row.event_date as string,
    endDate: row.end_date as string | null,
    coverImage: row.cover_image as string | null,
    maxGuests: row.max_guests as number | null,
    isPublic: row.is_public as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const eventsRepository = {
  async list(options?: { limit?: number }): Promise<EventEntity[]> {
    let query = supabase
      .from('events')
      .select('*')
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

    let q = supabase
      .from('events')
      .select('*')
      .gte('event_date', now.toISOString())
      .order('event_date', { ascending: true });

    if (options.query?.trim()) {
      const term = `%${options.query.trim()}%`;
      q = q.or(`title.ilike.${term},location.ilike.${term}`);
    }

    if (options.city) {
      q = q.ilike('location', `%${options.city}%`);
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
    // Free = ticket_price_cents is 0 AND no paid ticket tiers
    let q = supabase
      .from('events')
      .select('*, ticket_tiers!left(price_cents)')
      .gte('event_date', new Date().toISOString())
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
};
