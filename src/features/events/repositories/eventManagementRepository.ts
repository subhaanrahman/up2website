import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';
import { callEdgeFunction } from '@/infrastructure/api-client';

const log = createLogger('event-management.repository');

export const eventManagementRepository = {
  // ─── Waitlist ───

  async joinWaitlist(eventId: string, userId: string) {
    log.info('joinWaitlist', { eventId, userId });
    const result = await callEdgeFunction<{ status: string; position: number }>('waitlist-promote', {
      body: { action: 'join', event_id: eventId },
    });
    return result.position;
  },

  async leaveWaitlist(eventId: string, userId: string) {
    log.info('leaveWaitlist', { eventId, userId });
    await callEdgeFunction('waitlist-promote', {
      body: { action: 'leave', event_id: eventId },
    });
  },

  async getWaitlistEntry(eventId: string, userId: string) {
    const { data, error } = await supabase
      .from('waitlist')
      .select('id, position')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // ─── Cohosts ───

  async getCohosts(eventId: string) {
    const { data, error } = await supabase
      .from('event_cohosts')
      .select('id, organiser_profile_id, user_id, role')
      .eq('event_id', eventId);
    if (error) throw error;
    return data || [];
  },

  async insertCohosts(eventId: string, cohosts: { id: string; type: 'organiser' | 'personal'; role?: string }[]) {
    if (cohosts.length === 0) return;
    log.info('insertCohosts', { eventId, count: cohosts.length });
    const { error } = await supabase.from('event_cohosts').insert(
      cohosts.map(c => ({
        event_id: eventId,
        organiser_profile_id: c.type === 'organiser' ? c.id : null,
        user_id: c.type === 'personal' ? c.id : null,
        role: c.role || 'cohost',
      })),
    );
    if (error) throw error;
  },

  async removeCohosts(eventId: string, ids: string[]) {
    log.info('removeCohosts', { eventId, count: ids.length });
    for (const rid of ids) {
      const { error } = await supabase
        .from('event_cohosts')
        .delete()
        .eq('event_id', eventId)
        .or(`organiser_profile_id.eq.${rid},user_id.eq.${rid}`);
      if (error) throw error;
    }
  },

  // ─── Reminders ───

  async insertReminders(eventId: string, reminderTypes: string[]) {
    if (reminderTypes.length === 0) return;
    log.info('insertReminders', { eventId, count: reminderTypes.length });
    const { error } = await supabase.from('event_reminders').insert(
      reminderTypes.map(r => ({ event_id: eventId, reminder_type: r, is_enabled: true })),
    );
    if (error) throw error;
  },

  // ─── Media ───

  async getEventMedia(eventId: string) {
    const { data, error } = await supabase
      .from('event_media')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async insertMedia(params: { eventId: string; url: string; uploadedBy: string; sortOrder: number }) {
    log.info('insertMedia', { eventId: params.eventId, uploadedBy: params.uploadedBy });
    const { error } = await supabase.from('event_media').insert({
      event_id: params.eventId,
      url: params.url,
      uploaded_by: params.uploadedBy,
      sort_order: params.sortOrder,
    });
    if (error) throw error;
  },

  async deleteMedia(mediaId: string) {
    log.info('deleteMedia', { mediaId });
    await callEdgeFunction('event-media-manage', {
      body: { action: 'delete', media_id: mediaId },
    });
  },

  // ─── Ticket Tiers ───

  async getTicketTiers(eventId: string) {
    const { data, error } = await supabase
      .from('ticket_tiers')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async upsertTicketTiers(
    eventId: string,
    tiers: { id?: string; name: string; priceCents: number; availableQuantity: number }[],
  ) {
    if (tiers.length === 0) return;
    log.info('upsertTicketTiers', { eventId, count: tiers.length });
    const { error } = await supabase.from('ticket_tiers').upsert(
      tiers.map((t, idx) => ({
        id: t.id,
        event_id: eventId,
        name: t.name,
        price_cents: t.priceCents,
        available_quantity: t.availableQuantity,
        sort_order: idx,
      })),
      { onConflict: 'id' },
    );
    if (error) throw error;
  },

  async deleteTicketTiers(tierIds: string[]) {
    if (tierIds.length === 0) return;
    log.info('deleteTicketTiers', { count: tierIds.length });
    const { error } = await supabase.from('ticket_tiers').delete().in('id', tierIds);
    if (error) throw error;
  },

  // ─── VIP Table Tiers ───

  async getVipTableTiers(eventId: string) {
    const { data, error } = await supabase
      .from('vip_table_tiers')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async upsertVipTableTiers(
    eventId: string,
    tiers: { id?: string; name: string; description?: string | null; minSpendCents: number; availableQuantity: number; maxGuests: number; includedItems: string[] }[],
  ) {
    if (tiers.length === 0) return;
    log.info('upsertVipTableTiers', { eventId, count: tiers.length });
    const { error } = await supabase.from('vip_table_tiers').upsert(
      tiers.map((t, idx) => ({
        id: t.id,
        event_id: eventId,
        name: t.name,
        description: t.description ?? null,
        min_spend_cents: t.minSpendCents,
        available_quantity: t.availableQuantity,
        max_guests: t.maxGuests,
        included_items: t.includedItems,
        sort_order: idx,
      })),
      { onConflict: 'id' },
    );
    if (error) throw error;
  },

  async deleteVipTableTiers(tierIds: string[]) {
    if (tierIds.length === 0) return;
    log.info('deleteVipTableTiers', { count: tierIds.length });
    const { error } = await supabase.from('vip_table_tiers').delete().in('id', tierIds);
    if (error) throw error;
  },

  // ─── Auth / ownership ───

  async isOrganiserOwner(eventId: string, userId: string): Promise<boolean> {
    const { data: ev } = await supabase
      .from('events')
      .select('organiser_profile_id')
      .eq('id', eventId)
      .single();
    if (!ev?.organiser_profile_id) return false;
    const { data: org } = await supabase
      .from('organiser_profiles')
      .select('owner_id')
      .eq('id', ev.organiser_profile_id)
      .single();
    return org?.owner_id === userId;
  },

  async getEventOrganiserProfile(eventId: string) {
    const { data: ev } = await supabase
      .from('events')
      .select('organiser_profile_id')
      .eq('id', eventId)
      .single();
    if (!ev?.organiser_profile_id) return null;
    const { data: org } = await supabase
      .from('organiser_profiles')
      .select('*')
      .eq('id', ev.organiser_profile_id)
      .single();
    return org;
  },

  async hasValidTicket(eventId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'valid')
      .maybeSingle();
    return !!data;
  },

  async getCapacityInfo(eventId: string) {
    const { data: ev } = await supabase
      .from('events')
      .select('max_guests')
      .eq('id', eventId)
      .single();
    if (!ev?.max_guests) return { isFull: false, maxGuests: null, currentCount: 0 };
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('guest_count')
      .eq('event_id', eventId)
      .eq('status', 'going');
    const totalGuests = (rsvps || []).reduce((sum, r) => sum + ((r as any).guest_count || 1), 0);
    return { isFull: totalGuests >= ev.max_guests, maxGuests: ev.max_guests, currentCount: totalGuests };
  },

  async getEventWithOrganiserProfile(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*, organiser_profiles(display_name, owner_id)')
      .eq('id', eventId)
      .single();
    if (error) throw error;
    return data;
  },

  async getRefundsForEvent(eventId: string) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('event_id', eventId);
    const orderIds = (orders || []).map((o) => o.id);
    if (orderIds.length === 0) return [];
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
