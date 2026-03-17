import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNearbyEvents, fetchForYouEvents } from './feedService';

const mockGetNearbyEvents = vi.fn();
const mockSearch = vi.fn().mockResolvedValue([{ id: 'e1', title: 'Event 1', event_date: '2026-06-15T20:00:00Z' }]);
vi.mock('@/features/events/repositories/eventsRepository', () => ({
  eventsRepository: {
    getNearbyEvents: (...args: unknown[]) => mockGetNearbyEvents(...args),
    search: (...args: unknown[]) => mockSearch(...args),
    getUpcomingEventsByIds: vi.fn().mockResolvedValue([]),
    getUpcomingEventsByOrganiserIds: vi.fn().mockResolvedValue([]),
    getEventIdsByGoingUserIds: vi.fn().mockResolvedValue([]),
    getUserRsvpEventIds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../repositories/connectionsRepository', () => ({
  connectionsRepository: {
    getAcceptedConnections: vi.fn().mockResolvedValue([]),
    getFollowedOrganiserIds: vi.fn().mockResolvedValue([]),
    getFollowersByFriends: vi.fn().mockResolvedValue([]),
    getBlockedUserIds: vi.fn().mockResolvedValue(new Set()),
    getFriendIds: vi.fn().mockResolvedValue(new Set()),
  },
}));

vi.mock('../repositories/profilesRepository', () => ({
  profilesRepository: {
    getOwnedOrganiserIds: vi.fn().mockResolvedValue([]),
    getProfilesByIds: vi.fn().mockResolvedValue([]),
    getOrganisersByIds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../repositories/postsRepository', () => ({
  postsRepository: {
    getPostsForFeed: vi.fn().mockResolvedValue([]),
    getRepostsForFeed: vi.fn().mockResolvedValue([]),
    getPostsByIds: vi.fn().mockResolvedValue([]),
  },
}));

describe('feedService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('fetchNearbyEvents', () => {
    it('delegates to eventsRepository.getNearbyEvents', async () => {
      const mockEvents = [{ id: 'e1', title: 'Event 1' }];
      mockGetNearbyEvents.mockResolvedValue(mockEvents);

      const result = await fetchNearbyEvents('Sydney', 4);
      expect(result).toEqual(mockEvents);
      expect(mockGetNearbyEvents).toHaveBeenCalledWith('Sydney', 4);
    });

    it('passes null city', async () => {
      mockGetNearbyEvents.mockResolvedValue([]);
      await fetchNearbyEvents(null);
      expect(mockGetNearbyEvents).toHaveBeenCalledWith(null, 4);
    });
  });

  describe('fetchForYouEvents', () => {
    it('returns events array', async () => {
      const result = await fetchForYouEvents('user-1', 'Sydney', 15);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
