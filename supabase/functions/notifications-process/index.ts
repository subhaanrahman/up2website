import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { edgeLog } from "../_shared/logger.ts";
import { corsHeaders, getRequestId, errorResponse, successResponse } from "../_shared/response.ts";

/**
 * Notifications Service — Cron-triggered processor
 * 
 * Generates all scheduled/automated notifications:
 * 1. Upcoming Event Reminders (day before + day of) for ticket holders & RSVP'd users
 * 2. Saved Event Nudges ("Don't miss out" after 2-3 days of saving without purchasing)
 * 3. Friend Activity (friends going/interested in events)
 * 4. Gamification level-ups ("Your friend just moved into Silver")
 * 5. Suggested Accounts (weekly, capped to avoid spam)
 * 
 * Triggered notifications (real-time, called from other functions):
 * - Shared content (event/post/account from friend)
 * - New posts from followed organisers
 * - Friend requests
 * These are handled by `notifications-send` edge function called inline.
 */

interface NotificationInsert {
  user_id: string;
  type: string;
  title: string;
  message: string;
  avatar_url?: string | null;
  event_image?: string | null;
  link?: string | null;
}

// Dedup key: type + user_id + link (or title). Prevents duplicate notifications.
function deduplicationKey(n: NotificationInsert): string {
  return `${n.type}:${n.user_id}:${n.link || n.title}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const notifications: NotificationInsert[] = [];

    // ─── 1. UPCOMING EVENT REMINDERS (CONFIGURABLE) ────────────────────
    const reminderConfigs = [
      { type: '1_week', offsetMs: 7 * 24 * 60 * 60 * 1000, title: '📅 Next week!', message: 'is happening next week.' },
      { type: '1_day', offsetMs: 24 * 60 * 60 * 1000, title: '📅 Tomorrow\'s event', message: 'is tomorrow. Don\'t forget!' },
      { type: '2_hours', offsetMs: 2 * 60 * 60 * 1000, title: '⏰ Starting soon', message: 'starts in about 2 hours.' },
    ];

    const reminderWindowMs = 60 * 60 * 1000; // 1-hour window

    for (const cfg of reminderConfigs) {
      const windowStart = new Date(now.getTime() + cfg.offsetMs);
      const windowEnd = new Date(windowStart.getTime() + reminderWindowMs);

      const { data: reminderRows } = await serviceClient
        .from('event_reminders')
        .select('event_id, reminder_type, events!inner(id, title, cover_image, event_date, status)')
        .eq('is_enabled', true)
        .eq('reminder_type', cfg.type)
        .gte('events.event_date', windowStart.toISOString())
        .lt('events.event_date', windowEnd.toISOString())
        .eq('events.status', 'published');

      const events = (reminderRows || []).map((r: any) => r.events).filter(Boolean);
      const reminderEventIds = events.map((e: any) => e.id);
      if (reminderEventIds.length === 0) continue;

      const [{ data: rsvps }, { data: orders }] = await Promise.all([
        serviceClient
          .from('rsvps')
          .select('user_id, event_id')
          .in('event_id', reminderEventIds)
          .eq('status', 'going'),
        serviceClient
          .from('orders')
          .select('user_id, event_id')
          .in('event_id', reminderEventIds)
          .eq('status', 'confirmed'),
      ]);

      const eventMap = new Map<string, any>();
      events.forEach((e: any) => eventMap.set(e.id, e));

      const userEventPairs = new Map<string, { user_id: string; event_id: string }>();
      [...(rsvps || []), ...(orders || [])].forEach(r => {
        const key = `${r.user_id}:${r.event_id}`;
        if (!userEventPairs.has(key)) userEventPairs.set(key, r);
      });

      for (const { user_id, event_id } of userEventPairs.values()) {
        const event = eventMap.get(event_id);
        if (!event) continue;
        notifications.push({
          user_id,
          type: 'upcoming_event',
          title: cfg.title,
          message: `${event.title} ${cfg.message}`,
          event_image: event.cover_image,
          link: `/events/${event_id}?reminder=${cfg.type}`,
        });
      }
    }

    // ─── 2. SAVED EVENT NUDGES ─────────────────────────────────────────
    // Users who RSVP'd as "interested" 2-3 days ago but haven't purchased a ticket
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: savedRsvps } = await serviceClient
      .from('rsvps')
      .select('user_id, event_id, created_at')
      .eq('status', 'interested')
      .gte('created_at', threeDaysAgo.toISOString())
      .lte('created_at', twoDaysAgo.toISOString());

    if (savedRsvps && savedRsvps.length > 0) {
      const savedEventIds = [...new Set(savedRsvps.map(r => r.event_id))];
      const savedUserIds = [...new Set(savedRsvps.map(r => r.user_id))];

      // Check which users already have orders for these events
      const { data: existingOrders } = await serviceClient
        .from('orders')
        .select('user_id, event_id')
        .in('event_id', savedEventIds)
        .in('user_id', savedUserIds)
        .in('status', ['reserved', 'confirmed']);

      const hasOrder = new Set(
        (existingOrders || []).map(o => `${o.user_id}:${o.event_id}`)
      );

      // Fetch event details
      const { data: savedEvents } = await serviceClient
        .from('events')
        .select('id, title, cover_image, event_date')
        .in('id', savedEventIds)
        .gt('event_date', now.toISOString());

      const savedEventMap = new Map((savedEvents || []).map(e => [e.id, e]));

      for (const rsvp of savedRsvps) {
        if (hasOrder.has(`${rsvp.user_id}:${rsvp.event_id}`)) continue;
        const event = savedEventMap.get(rsvp.event_id);
        if (!event) continue;
        notifications.push({
          user_id: rsvp.user_id,
          type: 'saved_reminder',
          title: '🎟️ Don\'t miss out!',
          message: `You saved ${event.title} — tickets are still available. Grab yours before they sell out!`,
          event_image: event.cover_image,
          link: `/events/${rsvp.event_id}`,
        });
      }
    }

    // ─── 3. FRIEND ACTIVITY ────────────────────────────────────────────
    // Friends who RSVP'd to events in the last 24 hours
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentRsvps } = await serviceClient
      .from('rsvps')
      .select('user_id, event_id, created_at')
      .eq('status', 'going')
      .gte('created_at', oneDayAgo.toISOString())
      .limit(200);

    if (recentRsvps && recentRsvps.length > 0) {
      const rsvpUserIds = [...new Set(recentRsvps.map(r => r.user_id))];

      // Get connections for these users (accepted friends)
      const { data: connections } = await serviceClient
        .from('connections')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.in.(${rsvpUserIds.join(',')}),addressee_id.in.(${rsvpUserIds.join(',')})`);

      if (connections && connections.length > 0) {
        // Build friend map: user -> set of friends
        const friendMap = new Map<string, Set<string>>();
        for (const c of connections) {
          if (!friendMap.has(c.requester_id)) friendMap.set(c.requester_id, new Set());
          if (!friendMap.has(c.addressee_id)) friendMap.set(c.addressee_id, new Set());
          friendMap.get(c.requester_id)!.add(c.addressee_id);
          friendMap.get(c.addressee_id)!.add(c.requester_id);
        }

        // Fetch profile names for RSVP users
        const { data: rsvpProfiles } = await serviceClient
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', rsvpUserIds);
        const profileMap = new Map((rsvpProfiles || []).map(p => [p.user_id, p]));

        // Fetch event details
        const rsvpEventIds = [...new Set(recentRsvps.map(r => r.event_id))];
        const { data: rsvpEvents } = await serviceClient
          .from('events')
          .select('id, title, cover_image')
          .in('id', rsvpEventIds);
        const eventMap = new Map((rsvpEvents || []).map(e => [e.id, e]));

        for (const rsvp of recentRsvps) {
          const friends = friendMap.get(rsvp.user_id);
          if (!friends) continue;
          const profile = profileMap.get(rsvp.user_id);
          const event = eventMap.get(rsvp.event_id);
          if (!profile || !event) continue;

          for (const friendId of friends) {
            // Don't notify user about their own activity
            if (friendId === rsvp.user_id) continue;
            notifications.push({
              user_id: friendId,
              type: 'friend_activity',
              title: '👥 Friend Activity',
              message: `${profile.display_name || 'Your friend'} is going to ${event.title}`,
              avatar_url: profile.avatar_url,
              event_image: event.cover_image,
              link: `/events/${rsvp.event_id}`,
            });
          }
        }
      }
    }

    // ─── 4. GAMIFICATION LEVEL-UPS ─────────────────────────────────────
    // Check for users who leveled up in the last 24 hours
    const { data: recentLevelUps } = await serviceClient
      .from('user_points')
      .select('user_id, current_rank, updated_at')
      .gte('updated_at', oneDayAgo.toISOString());

    if (recentLevelUps && recentLevelUps.length > 0) {
      const levelUpUserIds = recentLevelUps.map(u => u.user_id);

      // Get their friends
      const { data: levelUpConnections } = await serviceClient
        .from('connections')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.in.(${levelUpUserIds.join(',')}),addressee_id.in.(${levelUpUserIds.join(',')})`);

      if (levelUpConnections) {
        const { data: levelUpProfiles } = await serviceClient
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', levelUpUserIds);
        const profMap = new Map((levelUpProfiles || []).map(p => [p.user_id, p]));

        const rankEmoji: Record<string, string> = {
          silver: '🥈', gold: '🥇', platinum: '💎', diamond: '💠',
        };

        for (const lu of recentLevelUps) {
          if (lu.current_rank === 'bronze') continue; // Don't notify for initial rank
          const profile = profMap.get(lu.user_id);
          if (!profile) continue;
          const emoji = rankEmoji[lu.current_rank] || '⭐';

          // Notify each friend
          for (const c of levelUpConnections) {
            const friendId = c.requester_id === lu.user_id ? c.addressee_id : c.addressee_id === lu.user_id ? c.requester_id : null;
            if (!friendId || friendId === lu.user_id) continue;

            notifications.push({
              user_id: friendId,
              type: 'friend_activity',
              title: `${emoji} Level Up!`,
              message: `${profile.display_name || 'Your friend'} just moved into ${lu.current_rank.charAt(0).toUpperCase() + lu.current_rank.slice(1)} — catch up?`,
              avatar_url: profile.avatar_url,
              link: `/profile`,
            });
          }
        }
      }
    }

    // ─── 5. SUGGESTED ACCOUNTS (weekly, max 3 per user per week) ──────
    // Only run on Mondays to avoid spam
    if (now.getDay() === 1) {
      // Get active users (users who logged in this week via recent RSVP or post)
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: activeUsers } = await serviceClient
        .from('profiles')
        .select('user_id')
        .gte('updated_at', oneWeekAgo.toISOString())
        .limit(500);

      if (activeUsers && activeUsers.length > 0) {
        // Check which users already got suggested_account notifs this week
        const activeUserIds = activeUsers.map(u => u.user_id);
        const { data: recentSuggestions } = await serviceClient
          .from('notifications')
          .select('user_id')
          .eq('type', 'suggested_account')
          .gte('created_at', oneWeekAgo.toISOString())
          .in('user_id', activeUserIds);

        const alreadyNotified = new Set((recentSuggestions || []).map(n => n.user_id));

        // Get popular organisers (by follower count)
        const { data: popularOrgs } = await serviceClient
          .from('organiser_profiles')
          .select('id, display_name, avatar_url, username')
          .limit(10);

        if (popularOrgs && popularOrgs.length > 0) {
          for (const user of activeUsers) {
            if (alreadyNotified.has(user.user_id)) continue;

            // Check which organisers user already follows
            const { data: following } = await serviceClient
              .from('organiser_followers')
              .select('organiser_profile_id')
              .eq('user_id', user.user_id);

            const followingSet = new Set((following || []).map(f => f.organiser_profile_id));
            const suggestions = popularOrgs.filter(o => !followingSet.has(o.id));

            // Cap at 3 suggestions per user per week
            for (const org of suggestions.slice(0, 3)) {
              notifications.push({
                user_id: user.user_id,
                type: 'suggested_account',
                title: '⭐ Suggested for you',
                message: `Check out ${org.display_name} — popular in your city!`,
                avatar_url: org.avatar_url,
                link: `/user/${org.id}`,
              });
            }
          }
        }
      }
    }

    // ─── DEDUPLICATION & INSERT ────────────────────────────────────────
    // Check for existing notifications to avoid duplicates
    if (notifications.length > 0) {
      // Fetch recent notifications (last 24h) for dedup
      const targetUserIds = [...new Set(notifications.map(n => n.user_id))];
      const { data: existingNotifs } = await serviceClient
        .from('notifications')
        .select('user_id, type, link, title')
        .in('user_id', targetUserIds.slice(0, 100)) // batch limit
        .gte('created_at', oneDayAgo.toISOString());

      const existingKeys = new Set(
        (existingNotifs || []).map(n => `${n.type}:${n.user_id}:${n.link || n.title}`)
      );

      const newNotifications = notifications.filter(
        n => !existingKeys.has(deduplicationKey(n))
      );

      // Respect user notification settings
      if (newNotifications.length > 0) {
        const settingsUserIds = [...new Set(newNotifications.map(n => n.user_id))];
        const { data: settings } = await serviceClient
          .from('notification_settings')
          .select('user_id, event_reminders, friend_activity, new_events')
          .in('user_id', settingsUserIds);

        const settingsMap = new Map(
          (settings || []).map(s => [s.user_id, s])
        );

        const filteredNotifications = newNotifications.filter(n => {
          const userSettings = settingsMap.get(n.user_id);
          if (!userSettings) return true; // Default: all enabled

          if (n.type === 'upcoming_event' || n.type === 'saved_reminder') {
            return userSettings.event_reminders !== false;
          }
          if (n.type === 'friend_activity' || n.type === 'friend_request') {
            return userSettings.friend_activity !== false;
          }
          if (n.type === 'suggested_account') {
            return userSettings.new_events !== false;
          }
          return true;
        });

        if (filteredNotifications.length > 0) {
          // Batch insert (max 500 at a time)
          for (let i = 0; i < filteredNotifications.length; i += 500) {
            const batch = filteredNotifications.slice(i, i + 500);
            const { error } = await serviceClient
              .from('notifications')
              .insert(batch);
            if (error) {
              edgeLog('error', 'Failed to insert notification batch', { requestId, error: String(error) });
            }
          }
        }

        edgeLog('info', `Notifications processed: ${notifications.length} generated, ${filteredNotifications.length} inserted (after dedup & settings)`, { requestId });

        return successResponse({
          generated: notifications.length,
          deduplicated: notifications.length - newNotifications.length,
          filtered_by_settings: newNotifications.length - filteredNotifications.length,
          inserted: filteredNotifications.length,
        }, requestId);
      }
    }

    return successResponse({
      generated: notifications.length,
      inserted: 0,
      message: 'No new notifications to send',
    }, requestId);
  } catch (err) {
    edgeLog('error', 'Notifications processor error', { requestId, error: String(err) });
    return errorResponse(500, 'Internal server error', { requestId });
  }
});
