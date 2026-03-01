// Client API wrappers — thin layer calling Edge Functions for writes

import { callEdgeFunction } from '@/infrastructure/api-client';
import type { AwardPointsResult, PointAction } from '@/features/loyalty/domain/types';
import type { CreateEventInput } from '@/features/events/domain/types';

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
      },
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

// --- Referrals API (stub) ---
export const referralsApi = {
  trackShare(eventId: string, channel: string) {
    return callEdgeFunction('referrals-track', {
      body: { event_id: eventId, channel },
    });
  },
};
