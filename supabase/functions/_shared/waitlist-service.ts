import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { computeWaitlistPositions, selectWaitlistPromotions } from "./waitlist-utils.ts";

export async function recomputeWaitlistPositions(sc: SupabaseClient, eventId: string) {
  const { data: rows, error } = await sc
    .from('waitlist')
    .select('id, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const updates = computeWaitlistPositions(rows || []);
  for (const u of updates) {
    const { error: updateErr } = await sc
      .from('waitlist')
      .update({ position: u.position })
      .eq('id', u.id);
    if (updateErr) throw updateErr;
  }

  return updates.length;
}

export async function enqueueWaitlist(sc: SupabaseClient, eventId: string, userId: string) {
  const { data: existing } = await sc
    .from('waitlist')
    .select('id, position')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing.position;

  const { count } = await sc
    .from('waitlist')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  const position = (count || 0) + 1;
  const { error } = await sc.from('waitlist').insert({
    event_id: eventId,
    user_id: userId,
    position,
  });
  if (error) throw error;
  return position;
}

export async function leaveWaitlist(sc: SupabaseClient, eventId: string, userId: string) {
  const { error } = await sc
    .from('waitlist')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
  await recomputeWaitlistPositions(sc, eventId);
}

export async function promoteWaitlist(sc: SupabaseClient, eventId: string) {
  const { data: event, error: eventErr } = await sc
    .from('events')
    .select('id, max_guests')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr) throw eventErr;
  if (!event || !event.max_guests) return { promoted: 0 };

  const [orderRows, rsvpRows, waitlistRows] = await Promise.all([
    sc
      .from('orders')
      .select('quantity, expires_at, status')
      .eq('event_id', eventId)
      .in('status', ['reserved', 'confirmed'])
      .gt('expires_at', new Date().toISOString()),
    sc
      .from('rsvps')
      .select('guest_count')
      .eq('event_id', eventId)
      .eq('status', 'going'),
    sc
      .from('waitlist')
      .select('id, user_id, created_at')
      .eq('event_id', eventId),
  ]);

  const orderQty = (orderRows.data ?? []).reduce((sum: number, o: any) => sum + (o.quantity ?? 0), 0);
  const rsvpGuests = (rsvpRows.data ?? []).reduce((sum: number, r: any) => sum + (r.guest_count ?? 1), 0);
  const totalOccupied = orderQty + rsvpGuests;

  const spots = Math.max(0, event.max_guests - totalOccupied);
  if (spots <= 0) return { promoted: 0 };

  const candidates = selectWaitlistPromotions(waitlistRows.data || [], spots);
  if (candidates.length === 0) return { promoted: 0 };

  const promotedUserIds: string[] = [];
  for (const entry of candidates) {
    const { data: existing } = await sc
      .from('rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', entry.user_id)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await sc.from('rsvps').insert({
        event_id: eventId,
        user_id: entry.user_id,
        status: 'going',
        guest_count: 1,
      });
      if (!insertErr) promotedUserIds.push(entry.user_id);
    }

    await sc.from('waitlist').delete().eq('id', entry.id);
  }

  await recomputeWaitlistPositions(sc, eventId);

  if (promotedUserIds.length > 0) {
    const { data: eventInfo } = await sc
      .from('events')
      .select('title, cover_image')
      .eq('id', eventId)
      .maybeSingle();

    const notifications = promotedUserIds.map((userId) => ({
      user_id: userId,
      type: 'waitlist_promoted',
      title: 'Spot opened! 🎟️',
      message: `${eventInfo?.title || 'An event'} now has space — you’re in!`,
      event_image: eventInfo?.cover_image || null,
      link: `/events/${eventId}`,
    }));

    await sc.from('notifications').insert(notifications);
  }

  return { promoted: promotedUserIds.length };
}
