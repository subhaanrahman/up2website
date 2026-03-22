// Events repository — DB access (reads only on client, writes via Edge Functions)

import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('events.repository');
import { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { EventEntity, Rsvp, DiscoveryRailsResponse } from '../domain/types';

export type EventFilter = 'all' | 'tonight' | 'thisWeek' | 'thisMonth' | 'free';

/** Columns required by `mapEventRow` — avoids `select('*')` on hot list/search paths (lower PostgREST egress). */
const EVENT_LIST_COLUMNS =
  'id,host_id,title,description,location,venue_name,address,event_date,end_date,cover_image,category,max_guests,is_public,publish_at,vip_tables_enabled,refunds_enabled,refund_policy_text,refund_deadline_hours_before_event,tickets_available_from,tickets_available_until,created_at,updated_at,ticket_price_cents';

/** Safety cap when callers omit `limit` (prevents unbounded published-event scans). */
const DEFAULT_EVENTS_LIST_LIMIT = 200;

function mapEventRow(row: Record<string, unknown>): EventEntity {
  const ticketPriceCents = row.ticket_price_cents as number | undefined;
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
    publishAt: (row.publish_at as string | null) ?? null,
    vipTablesEnabled: (row.vip_tables_enabled as boolean) ?? false,
    refundsEnabled: (row.refunds_enabled as boolean) ?? false,
    refundPolicyText: (row.refund_policy_text as string | null) ?? null,
    refundDeadlineHoursBeforeEvent:
      (row.refund_deadline_hours_before_event as number | null | undefined) ?? null,
    ticketsAvailableFrom: (row.tickets_available_from as string) ?? null,
    ticketsAvailableUntil: (row.tickets_available_until as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    ticketPriceCents: ticketPriceCents != null ? ticketPriceCents : undefined,
  };
}

/** Hosted rows not yet "discoverable" (e.g. scheduled) — merge into list/search for the host user only. */
function hostedMatchesSearchFilters(
  ev: EventEntity,
  options: { query?: string; filter?: EventFilter; city?: string },
): boolean {
  const now = new Date();
  const nowIso = now.toISOString();
  if (new Date(ev.eventDate) < new Date(nowIso)) return false;

  const q = options.query?.trim().toLowerCase();
  if (q) {
    const hay = `${ev.title} ${ev.location ?? ''} ${ev.venueName ?? ''} ${ev.address ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (options.city) {
    const c = options.city.toLowerCase();
    if (!`${ev.location ?? ''} ${ev.address ?? ''}`.toLowerCase().includes(c)) return false;
  }

  const evDate = new Date(ev.eventDate);
  if (options.filter === 'tonight') {
    if (evDate < startOfToday() || evDate > endOfToday()) return false;
  } else if (options.filter === 'thisWeek') {
    if (evDate < startOfToday() || evDate > endOfWeek(now, { weekStartsOn: 1 })) return false;
  } else if (options.filter === 'thisMonth') {
    if (evDate < startOfToday() || evDate > endOfMonth(now)) return false;
  } else if (options.filter === 'free') {
    if ((ev.ticketPriceCents ?? 0) > 0) return false;
  }

  return true;
}

function mergeDiscoveryDedupeSort(base: EventEntity[], extras: EventEntity[]): EventEntity[] {
  const seen = new Set(base.map((e) => e.id));
  const merged = [...base];
  for (const e of extras) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      merged.push(e);
    }
  }
  return merged.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

export const eventsRepository = {
  /** All events where this user is host (any status, incl. organiser-linked). */
  async getHostedEventsForUser(userId: string): Promise<EventEntity[]> {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_LIST_COLUMNS)
      .eq('host_id', userId)
      .order('event_date', { ascending: true })
      .limit(DEFAULT_EVENTS_LIST_LIMIT);

    if (error) throw error;
    return (data || []).map(mapEventRow);
  },

  async list(options?: { limit?: number; hostUserId?: string | null }): Promise<EventEntity[]> {
    const now = new Date().toISOString();
    const cap = options?.limit ?? DEFAULT_EVENTS_LIST_LIMIT;
    let query = supabase
      .from('events')
      .select(EVENT_LIST_COLUMNS)
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .order('event_date', { ascending: true })
      .limit(cap);

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const base = (data || []).map(mapEventRow);
    const hostId = options?.hostUserId;
    if (!hostId) return base;
    const hosted = await this.getHostedEventsForUser(hostId);
    const extra = hosted.filter((h) => !base.some((b) => b.id === h.id));
    return mergeDiscoveryDedupeSort(base, extra);
  },

  async search(options: {
    query?: string;
    filter?: EventFilter;
    city?: string;
    limit?: number;
    hostUserId?: string | null;
  }): Promise<EventEntity[]> {
    const now = new Date();

    // For "free" filter we need to join ticket_tiers; otherwise plain events query
    if (options.filter === 'free') {
      return this._searchFreeEvents(options);
    }

    const nowIso = now.toISOString();
    const cap = options.limit ?? DEFAULT_EVENTS_LIST_LIMIT;
    let q = supabase
      .from('events')
      .select(EVENT_LIST_COLUMNS)
      .eq('status', 'published')
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .gte('event_date', nowIso)
      .order('event_date', { ascending: true })
      .limit(cap);

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

    const { data, error } = await q;
    if (error) throw error;
    const base = (data || []).map(mapEventRow);
    const hostId = options.hostUserId;
    if (!hostId) return base;
    const hosted = await this.getHostedEventsForUser(hostId);
    const extra = hosted.filter(
      (h) => !base.some((b) => b.id === h.id) && hostedMatchesSearchFilters(h, options),
    );
    return mergeDiscoveryDedupeSort(base, extra);
  },

  async _searchFreeEvents(options: {
    query?: string;
    limit?: number;
    city?: string;
    hostUserId?: string | null;
  }): Promise<EventEntity[]> {
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
    if (options.city) {
      q = q.or(`location.ilike.%${options.city}%,address.ilike.%${options.city}%`);
    }
    q = q.limit(options.limit ?? DEFAULT_EVENTS_LIST_LIMIT);

    const { data, error } = await q;
    if (error) throw error;

    // Filter out events that have any paid ticket tier
    const freeEvents = (data || []).filter((row: any) => {
      const tiers = row.ticket_tiers || [];
      return tiers.every((t: any) => t.price_cents === 0);
    });

    const base = freeEvents.map(mapEventRow);
    const hostId = options.hostUserId;
    if (!hostId) return base;

    const hosted = await this.getHostedEventsForUser(hostId);
    const extraCandidates = hosted.filter(
      (h) =>
        !base.some((b) => b.id === h.id) &&
        (h.ticketPriceCents ?? 0) === 0 &&
        hostedMatchesSearchFilters(h, { ...options, filter: 'free' }),
    );
    if (extraCandidates.length === 0) return base;

    const ids = extraCandidates.map((e) => e.id);
    const { data: tierRows } = await supabase
      .from('ticket_tiers')
      .select('event_id, price_cents')
      .in('event_id', ids);
    const paidEventIds = new Set<string>();
    for (const t of tierRows || []) {
      if (t.price_cents > 0) paidEventIds.add(t.event_id);
    }
    const extraFree = extraCandidates.filter((e) => !paidEventIds.has(e.id));
    return mergeDiscoveryDedupeSort(base, extraFree);
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
      .select(EVENT_LIST_COLUMNS)
      .eq('host_id', hostId)
      .is('organiser_profile_id', null)
      .order('event_date', { ascending: true })
      .limit(DEFAULT_EVENTS_LIST_LIMIT);

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
      .select(EVENT_LIST_COLUMNS)
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
      .select(EVENT_LIST_COLUMNS)
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
    if (error) {
      throw error;
    }
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

  async getDiscoveryRails(params: {
    city?: string | null;
    friendIds?: string[];
    limit?: number;
  }): Promise<DiscoveryRailsResponse> {
    const limit = params.limit ?? 12;
    const [nearby, trending] = await Promise.all([
      this.search({ city: params.city ?? undefined, limit: Math.min(limit, 8) }),
      this.search({ limit }).then((rows) => rows.slice(0, limit)),
    ]);

    let friendsGoing: EventEntity[] = [];
    if (params.friendIds && params.friendIds.length > 0) {
      const ids = await this.getEventIdsByGoingUserIds(params.friendIds.slice(0, 25));
      if (ids.length > 0) {
        friendsGoing = await this.getUpcomingEventsByIds(ids.slice(0, limit));
      }
    }

    const soon = [...trending]
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, limit);

    return { nearby, trending, friendsGoing, soon };
  },
};
