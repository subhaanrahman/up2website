/**
 * Job handler implementations.
 *
 * Import this file once (at function entry) to register all handlers
 * before any enqueue() calls.
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  registerHandler,
  type NotificationSendPayload,
  type LoyaltyAwardPayload,
  type RankUpVoucherPayload,
  type AutoRsvpPayload,
  type TicketsIssuePayload,
} from "./queue.ts";

// ── notification.send ──────────────────────────────────────────────
registerHandler<NotificationSendPayload>(
  'notification.send',
  async (payload, sc) => {
    const { error } = await sc.from('notifications').insert({
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      avatar_url: payload.avatar_url ?? null,
      event_image: payload.event_image ?? null,
      link: payload.link ?? null,
      organiser_profile_id: payload.organiser_profile_id ?? null,
    });
    if (error) throw new Error(`notification.send failed: ${error.message}`);
  },
);

// ── loyalty.award_points ───────────────────────────────────────────
registerHandler<LoyaltyAwardPayload>(
  'loyalty.award_points',
  async (payload, sc) => {
    const POINTS_MAP: Record<string, number> = {
      add_friend: 10, save_event: 5, like_post: 5, follow_organiser: 10,
      share_event: 15, rsvp_event: 20, buy_ticket: 50, create_event: 30, app_review: 25,
    };
    const points = POINTS_MAP[payload.action_type] ?? 0;
    if (points === 0) return;

    const { data: existing } = await sc
      .from('user_points')
      .select('total_points, current_rank')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    const currentPoints = existing?.total_points ?? 0;
    const newTotal = currentPoints + points;

    const rankThresholds: Array<[number, string]> = [
      [4000, 'diamond'], [3000, 'platinum'], [2000, 'gold'], [1000, 'silver'],
    ];
    const newRank = rankThresholds.find(([t]) => newTotal >= t)?.[1] ?? 'bronze';

    await sc.from('user_points').upsert(
      { user_id: payload.user_id, total_points: newTotal, current_rank: newRank, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

    await sc.from('point_transactions').insert({
      user_id: payload.user_id,
      points,
      action_type: payload.action_type,
      description: payload.description || null,
    });

    // Trigger rank-up voucher as a separate concern
    const oldRank = existing?.current_rank ?? 'bronze';
    if (newRank !== oldRank) {
      // Import dynamically to avoid circular — but since we're already in handlers, just inline it
      const { enqueue } = await import("./queue.ts");
      await enqueue('loyalty.rank_up_voucher', { user_id: payload.user_id, new_rank: newRank });
    }
  },
);

// ── loyalty.rank_up_voucher ────────────────────────────────────────
registerHandler<RankUpVoucherPayload>(
  'loyalty.rank_up_voucher',
  async (payload, sc) => {
    await sc.from('user_vouchers').insert({
      user_id: payload.user_id,
      code: 'REWARD-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
      value_cents: 500,
      earned_at_rank: payload.new_rank,
      status: 'available',
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  },
);

// ── rsvp.auto_mark_going ───────────────────────────────────────────
registerHandler<AutoRsvpPayload>(
  'rsvp.auto_mark_going',
  async (payload, sc) => {
    await sc.from('rsvps').upsert(
      { event_id: payload.event_id, user_id: payload.user_id, status: payload.status },
      { onConflict: 'event_id,user_id' },
    );
  },
);

// ── tickets.issue ──────────────────────────────────────────────────
registerHandler<TicketsIssuePayload>(
  'tickets.issue',
  async (payload, sc) => {
    const tickets = Array.from({ length: payload.quantity }, (_, i) => ({
      order_id: payload.order_id,
      event_id: payload.event_id,
      ticket_tier_id: payload.ticket_tier_id,
      user_id: payload.user_id,
      qr_code: `TKT-${payload.order_id.slice(0, 8)}-${i + 1}-${crypto.randomUUID().slice(0, 8)}`,
      status: 'valid',
    }));

    const { error } = await sc.from('tickets').insert(tickets);
    if (error) throw new Error(`tickets.issue failed: ${error.message}`);
  },
);

// ── cleanup.expired_notifications ──────────────────────────────────
registerHandler<Record<string, never>>(
  'cleanup.expired_notifications',
  async (_payload, sc) => {
    await sc.rpc('purge_expired_notifications');
  },
);

// ── cleanup.expired_orders ─────────────────────────────────────────
registerHandler<Record<string, never>>(
  'cleanup.expired_orders',
  async (_payload, sc) => {
    const { error } = await sc
      .from('orders')
      .update({ status: 'expired', cancelled_at: new Date().toISOString() })
      .eq('status', 'reserved')
      .lt('expires_at', new Date().toISOString());
    if (error) console.error('cleanup.expired_orders error:', error);
  },
);
