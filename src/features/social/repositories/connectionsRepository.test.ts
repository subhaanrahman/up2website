import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectionsRepository } from './connectionsRepository';

let chainRes: { data: unknown; error: unknown } = { data: [], error: null };

function createChain() {
  const res = chainRes;
  const chain = {
    from: () => chain,
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    eq: () => chain,
    or: () => chain,
    order: () => chain,
    limit: () => chain,
    in: () => chain,
    maybeSingle: () => chain,
    single: () => chain,
    then: (cb: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

vi.mock('@/infrastructure/supabase', () => ({
  supabase: { from: () => createChain() },
}));

vi.mock('@/infrastructure/logger', () => ({
  createLogger: () => ({ info: () => {}, error: () => {}, warn: () => {} }),
}));

describe('connectionsRepository', () => {
  beforeEach(() => {
    chainRes = { data: [], error: null };
  });

  describe('getFriendIds', () => {
    it('returns set of friend ids from accepted connections', async () => {
      chainRes = {
        data: [
          { requester_id: 'u1', addressee_id: 'u2' },
          { requester_id: 'u3', addressee_id: 'u1' },
        ],
        error: null,
      };

      const result = await connectionsRepository.getFriendIds('u1');
      expect(result).toEqual(new Set(['u2', 'u3']));
    });

    it('returns empty set when no connections', async () => {
      chainRes = { data: [], error: null };

      const result = await connectionsRepository.getFriendIds('u1');
      expect(result).toEqual(new Set());
    });

    it('throws on error', async () => {
      chainRes = { data: null, error: { message: 'DB error' } };

      await expect(connectionsRepository.getFriendIds('u1')).rejects.toEqual({
        message: 'DB error',
      });
    });
  });

  describe('getAcceptedConnections', () => {
    it('returns connections where user is requester or addressee', async () => {
      chainRes = {
        data: [
          { requester_id: 'u1', addressee_id: 'u2' },
          { requester_id: 'u3', addressee_id: 'u1' },
        ],
        error: null,
      };

      const result = await connectionsRepository.getAcceptedConnections('u1');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ requester_id: 'u1', addressee_id: 'u2' });
    });

    it('returns empty array when no data', async () => {
      chainRes = { data: null, error: null };

      const result = await connectionsRepository.getAcceptedConnections('u1');
      expect(result).toEqual([]);
    });
  });

  describe('getConnectionBetween', () => {
    it('returns connection when found', async () => {
      chainRes = {
        data: { id: 'c1', requester_id: 'u1', addressee_id: 'u2', status: 'accepted' },
        error: null,
      };

      const result = await connectionsRepository.getConnectionBetween('u1', 'u2');
      expect(result).toMatchObject({ requester_id: 'u1', addressee_id: 'u2' });
    });

    it('returns null when no connection', async () => {
      chainRes = { data: null, error: null };

      const result = await connectionsRepository.getConnectionBetween('u1', 'u2');
      expect(result).toBeNull();
    });
  });

  describe('getFollowedOrganiserIds', () => {
    it('returns list of organiser ids user follows', async () => {
      chainRes = {
        data: [
          { organiser_profile_id: 'o1' },
          { organiser_profile_id: 'o2' },
        ],
        error: null,
      };

      const result = await connectionsRepository.getFollowedOrganiserIds('u1');
      expect(result).toEqual(['o1', 'o2']);
    });

    it('returns empty array when no follows', async () => {
      chainRes = { data: [], error: null };

      const result = await connectionsRepository.getFollowedOrganiserIds('u1');
      expect(result).toEqual([]);
    });
  });

  describe('getBlockedUserIds', () => {
    it('returns set of blocked user ids', async () => {
      chainRes = {
        data: [
          { blocker_id: 'u1', blocked_id: 'u2' },
          { blocker_id: 'u3', blocked_id: 'u1' },
        ],
        error: null,
      };

      const result = await connectionsRepository.getBlockedUserIds('u1');
      expect(result).toEqual(new Set(['u2', 'u3']));
    });
  });

  describe('getFollowersByFriends', () => {
    it('returns organiser ids that friends follow', async () => {
      chainRes = {
        data: [{ organiser_profile_id: 'o1' }, { organiser_profile_id: 'o2' }],
        error: null,
      };

      const result = await connectionsRepository.getFollowersByFriends(['f1', 'f2']);
      expect(result).toEqual(['o1', 'o2']);
    });

    it('returns empty array when friendIds empty', async () => {
      const result = await connectionsRepository.getFollowersByFriends([]);
      expect(result).toEqual([]);
    });
  });

  describe('sendRequest', () => {
    it('does not throw when success', async () => {
      chainRes = { data: null, error: null };

      await expect(
        connectionsRepository.sendRequest('u1', 'u2'),
      ).resolves.toBeUndefined();
    });

    it('throws on error', async () => {
      chainRes = { data: null, error: { message: 'Insert failed' } };

      await expect(connectionsRepository.sendRequest('u1', 'u2')).rejects.toEqual({
        message: 'Insert failed',
      });
    });
  });

  describe('getFollowStatus', () => {
    it('returns follow record when user follows organiser', async () => {
      chainRes = {
        data: { organiser_profile_id: 'o1', user_id: 'u1', muted: false },
        error: null,
      };

      const result = await connectionsRepository.getFollowStatus('o1', 'u1');
      expect(result).toMatchObject({ organiser_profile_id: 'o1', user_id: 'u1' });
    });

    it('returns null when not following', async () => {
      chainRes = { data: null, error: null };

      const result = await connectionsRepository.getFollowStatus('o1', 'u1');
      expect(result).toBeNull();
    });
  });
});
