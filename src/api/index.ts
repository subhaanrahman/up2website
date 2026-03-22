// Client API wrappers — thin layer calling Edge Functions for writes

import { callEdgeFunction } from '@/infrastructure/api-client';
import { config } from '@/infrastructure/config';
import { supabase } from '@/infrastructure/supabase';
import { parseApiError } from '@/infrastructure/errors';
import type { AwardPointsResult, PointAction } from '@/features/loyalty/domain/types';
import type { CreateEventInput, UpdateEventInput } from '@/features/events/domain/types';

// --- Loyalty API ---
export const loyaltyApi = {
  awardPoints(actionType: PointAction, description?: string): Promise<AwardPointsResult> {
    return callEdgeFunction<AwardPointsResult>('loyalty-award-points', {
      body: { action_type: actionType, description },
    });
  },
};

// --- Events API (writes) ---
export const eventsApi = {
  create(input: CreateEventInput) {
    return callEdgeFunction<Record<string, unknown>>('events-create', {
      body: {
        title: input.title,
        description: input.description,
        location: input.location,
        venue_name: input.venueName,
        address: input.address,
        event_date: input.eventDate,
        end_date: input.endDate,
        max_guests: input.maxGuests,
        is_public: input.isPublic,
        cover_image: input.coverImage,
        organiser_profile_id: input.organiserProfileId,
        publish_at: input.publishAt,
        tickets_available_from: input.ticketsAvailableFrom,
        tickets_available_until: input.ticketsAvailableUntil,
        vip_tables_enabled: input.vipTablesEnabled,
        refunds_enabled: input.refundsEnabled,
        refund_policy_text: input.refundPolicyText ?? null,
        refund_deadline_hours_before_event: input.refundDeadlineHoursBeforeEvent ?? null,
      },
    });
  },

  update(input: UpdateEventInput) {
    const { id, ...fields } = input;
    return callEdgeFunction<Record<string, unknown>>('events-update', {
      body: {
        action: 'update',
        event_id: id,
        title: fields.title,
        description: fields.description,
        location: fields.location,
        venue_name: fields.venueName,
        address: fields.address,
        event_date: fields.eventDate,
        end_date: fields.endDate,
        max_guests: fields.maxGuests,
        is_public: fields.isPublic,
        cover_image: fields.coverImage,
        publish_at: fields.publishAt,
        tickets_available_from: fields.ticketsAvailableFrom,
        tickets_available_until: fields.ticketsAvailableUntil,
        vip_tables_enabled: fields.vipTablesEnabled,
        refunds_enabled: fields.refundsEnabled,
        refund_policy_text: fields.refundPolicyText,
        refund_deadline_hours_before_event: fields.refundDeadlineHoursBeforeEvent,
      },
    });
  },

  delete(eventId: string) {
    return callEdgeFunction<{ success: boolean }>('events-update', {
      body: { action: 'delete', event_id: eventId },
    });
  },
};

export const refundsApi = {
  requestSelf(orderId: string) {
    return callEdgeFunction<{ success: boolean; refund_id?: string }>('refunds-request-self', {
      body: { order_id: orderId },
    });
  },
};

// --- RSVP API ---
export const rsvpApi = {
  join(eventId: string, status = 'going', guestCount = 1) {
    return callEdgeFunction<Record<string, unknown>>('rsvp', {
      body: { action: 'join', event_id: eventId, status, guest_count: guestCount },
    });
  },

  leave(eventId: string) {
    return callEdgeFunction<{ success: boolean }>('rsvp', {
      body: { action: 'leave', event_id: eventId },
    });
  },
};

// --- RSVP Approval API (hosts/cohosts) ---
export const rsvpApprovalApi = {
  approve(rsvpId: string) {
    return callEdgeFunction<{ success: boolean }>('rsvp-approve', {
      body: { action: 'approve', rsvp_id: rsvpId },
    });
  },
  decline(rsvpId: string) {
    return callEdgeFunction<{ success: boolean }>('rsvp-approve', {
      body: { action: 'decline', rsvp_id: rsvpId },
    });
  },
};

// --- Settings API ---
export const settingsApi = {
  upsertPrivacy(settings: Record<string, boolean>) {
    return callEdgeFunction<{ success: boolean }>('settings-upsert', {
      body: { table: 'privacy_settings', settings },
    });
  },
  upsertNotifications(settings: Record<string, boolean>) {
    return callEdgeFunction<{ success: boolean }>('settings-upsert', {
      body: { table: 'notification_settings', settings },
    });
  },
};

// --- Profile API (writes) ---
export const profileApi = {
  update(fields: Record<string, unknown>) {
    return callEdgeFunction<{ success: boolean }>('profile-update', {
      body: { action: 'update', ...fields },
    });
  },

  regenerateProfileQr(): Promise<{ qr_code: string }> {
    return callEdgeFunction<{ qr_code: string }>('profile-qr-regenerate', { body: {} });
  },

  async uploadAvatar(file: File): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${config.functionsUrl}/avatar-upload`, {
      method: 'POST',
      headers: {
        'apikey': config.supabase.anonKey,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) throw parseApiError(res.status, json);
    return (json as { avatar_url: string }).avatar_url;
  },
};

// --- Messaging API (writes via message-send edge function) ---
export const messagingApi = {
  sendEventMessage(eventId: string, content: string) {
    return callEdgeFunction<{ success: boolean }>('message-send', {
      body: { type: 'event-board', event_id: eventId, content },
    });
  },
};

// --- Referrals API (stub) ---
export const referralsApi = {
  trackShare(eventId: string, channel: string) {
    return callEdgeFunction('referrals-track', {
      body: { action: 'share', event_id: eventId, channel },
    });
  },
  trackClick(eventId: string, channel: string, sessionId: string) {
    return callEdgeFunction<{ click_id: string }>('referrals-track', {
      body: { action: 'click', event_id: eventId, channel, session_id: sessionId },
    });
  },
  trackView(eventId: string, sessionId: string) {
    return callEdgeFunction('referrals-track', {
      body: { action: 'view', event_id: eventId, session_id: sessionId },
    });
  },
};
