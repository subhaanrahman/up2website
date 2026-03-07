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
        event_date: input.eventDate,
        end_date: input.endDate,
        category: input.category,
        max_guests: input.maxGuests,
        is_public: input.isPublic,
        cover_image: input.coverImage,
        organiser_profile_id: input.organiserProfileId,
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
        event_date: fields.eventDate,
        end_date: fields.endDate,
        category: fields.category,
        max_guests: fields.maxGuests,
        is_public: fields.isPublic,
        cover_image: fields.coverImage,
      },
    });
  },

  delete(eventId: string) {
    return callEdgeFunction<{ success: boolean }>('events-update', {
      body: { action: 'delete', event_id: eventId },
    });
  },
};

// --- RSVP API ---
export const rsvpApi = {
  join(eventId: string, status = 'going') {
    return callEdgeFunction<Record<string, unknown>>('rsvp', {
      body: { action: 'join', event_id: eventId, status },
    });
  },

  leave(eventId: string) {
    return callEdgeFunction<{ success: boolean }>('rsvp', {
      body: { action: 'leave', event_id: eventId },
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

// --- Referrals API (stub) ---
export const referralsApi = {
  trackShare(eventId: string, channel: string) {
    return callEdgeFunction('referrals-track', {
      body: { event_id: eventId, channel },
    });
  },
};