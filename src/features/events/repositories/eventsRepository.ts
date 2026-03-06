// Events repository — DB access (reads only on client, writes via Edge Functions)

import { supabase } from '@/infrastructure/supabase';
import type { EventEntity, Rsvp } from '../domain/types';

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
    category: row.category as string | null,
    maxGuests: row.max_guests as number | null,
    isPublic: row.is_public as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const eventsRepository = {
  async list(options?: { limit?: number; category?: string }): Promise<EventEntity[]> {
    let query = supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapEventRow);
  },

  async search(options: { query?: string; category?: string; limit?: number }): Promise<EventEntity[]> {
    let q = supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (options.query?.trim()) {
      const term = `%${options.query.trim()}%`;
      q = q.or(`title.ilike.${term},location.ilike.${term}`);
    }
    if (options.category) {
      q = q.eq('category', options.category);
    }
    if (options.limit) {
      q = q.limit(options.limit);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapEventRow);
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
