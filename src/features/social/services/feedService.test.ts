import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNearbyEvents, fetchForYouEvents, fetchFeedPage } from './feedService';

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
    getEventSummariesByIds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../repositories/connectionsRepository', () => ({
  connectionsRepository: {
    getAcceptedConnections: vi.fn().mockResolvedValue([]),
    getFollowedOrganiserIds: vi.fn().mockResolvedValue([]),
    getFollowersByFriends: vi.fn().mockResolvedValue([]),
    getBlockedUserIds: vi.fn().mockResolvedValue(new Set()),
    getMutedConnectionIds: vi.fn().mockResolvedValue(new Set()),
    getMutedOrganiserIds: vi.fn().mockResolvedValue(new Set()),
    getFriendIds: vi.fn().mockResolvedValue(new Set()),
  },
}));

vi.mock('../repositories/profilesRepository', () => ({
  profilesRepository: {
    getOwnedOrganiserIds: vi.fn().mockResolvedValue([]),
    getProfilesByIds: vi.fn().mockResolvedValue([]),
    getOrganisersByIds: vi.fn().mockResolvedValue([]),
    getProfileDisplayInfo: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../repositories/postsRepository', () => ({
  postsRepository: {
    getPostsForFeed: vi.fn().mockResolvedValue([]),
    getRepostsForFeed: vi.fn().mockResolvedValue([]),
    getPostsByIds: vi.fn().mockResolvedValue([]),
    getCollaboratorsByPostIds: vi.fn().mockResolvedValue([]),
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

  describe('fetchFeedPage', () => {
    it('pins newest self-authored post into first page when missing', async () => {
      const { postsRepository } = await import('../repositories/postsRepository');
      const { profilesRepository } = await import('../repositories/profilesRepository');

      (postsRepository.getPostsForFeed as any).mockResolvedValue([
        { id: 'p1', content: 'A', created_at: '2026-03-22T10:00:00Z', author_id: 'u2', organiser_profile_id: null, image_url: null, gif_url: null, event_id: null },
        { id: 'p2', content: 'B', created_at: '2026-03-22T09:00:00Z', author_id: 'u3', organiser_profile_id: null, image_url: null, gif_url: null, event_id: null },
        { id: 'p3', content: 'Me', created_at: '2026-03-22T08:00:00Z', author_id: 'u1', organiser_profile_id: null, image_url: null, gif_url: null, event_id: null },
      ]);
      (postsRepository.getRepostsForFeed as any).mockResolvedValue([]);
      (postsRepository.getPostsByIds as any).mockResolvedValue([]);
      (profilesRepository.getProfilesByIds as any).mockResolvedValue([
        { user_id: 'u1', display_name: 'Me', username: 'me', avatar_url: null, is_verified: false },
        { user_id: 'u2', display_name: 'Two', username: 'two', avatar_url: null, is_verified: false },
        { user_id: 'u3', display_name: 'Three', username: 'three', avatar_url: null, is_verified: false },
      ]);

      const ctx = {
        userId: 'u1',
        friendIds: new Set<string>(),
        followedOrgIds: new Set<string>(),
        friendFollowedOrgIds: new Set<string>(),
        mutedFriendIds: new Set<string>(),
        mutedOrgIds: new Set<string>(),
      };

      const result = await fetchFeedPage(ctx, null, 2);
      expect(result.posts.length).toBe(2);
      expect(result.posts.some(p => p.author_id === 'u1')).toBe(true);
      expect(result.posts[0].author_id).toBe('u1');
    });
  });
});
