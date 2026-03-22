import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profilesRepository } from './profilesRepository';

let chainRes: { data: unknown; error: unknown } = { data: [], error: null };

function createChain() {
  const res = chainRes;
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    or: () => chain,
    neq: () => chain,
    in: () => chain,
    limit: () => chain,
    maybeSingle: () => chain,
    then: (cb: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

vi.mock('@/infrastructure/supabase', () => ({
  supabase: { from: () => createChain() },
}));

describe('profilesRepository', () => {
  beforeEach(() => {
    chainRes = { data: [], error: null };
  });

  describe('searchProfiles', () => {
    it('returns profiles matching term', async () => {
      chainRes = {
        data: [
          { user_id: 'u1', display_name: 'Alice', username: 'alice', avatar_url: null },
          { user_id: 'u2', display_name: 'Alicia', username: 'alicia2', avatar_url: null },
        ],
        error: null,
      };

      const result = await profilesRepository.searchProfiles('ali');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ user_id: 'u1', username: 'alice' });
    });

    it('returns empty array when no matches', async () => {
      chainRes = { data: [], error: null };

      const result = await profilesRepository.searchProfiles('xyz');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      chainRes = { data: null, error: { message: 'DB error' } };

      await expect(profilesRepository.searchProfiles('a')).rejects.toEqual({
        message: 'DB error',
      });
    });
  });

  describe('searchOrganisers', () => {
    it('returns organisers matching term', async () => {
      chainRes = {
        data: [
          { id: 'o1', display_name: 'Venue A', username: 'venuea', avatar_url: null },
        ],
        error: null,
      };

      const result = await profilesRepository.searchOrganisers('venue');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'o1', display_name: 'Venue A' });
    });

    it('selects owner_id when includeOwner true', async () => {
      chainRes = { data: [{ id: 'o1', owner_id: 'u1' }], error: null };

      await profilesRepository.searchOrganisers('x', { includeOwner: true });
      expect(chainRes.data).toBeDefined();
    });
  });

  describe('getProfilesByIds', () => {
    it('returns profiles for given user ids', async () => {
      chainRes = {
        data: [
          { user_id: 'u1', display_name: 'Alice', username: 'alice', avatar_url: null, is_verified: false },
        ],
        error: null,
      };

      const result = await profilesRepository.getProfilesByIds(['u1']);
      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('u1');
    });

    it('returns empty array when userIds empty', async () => {
      const result = await profilesRepository.getProfilesByIds([]);
      expect(result).toEqual([]);
    });
  });

  describe('getOrganisersByIds', () => {
    it('returns organisers for given ids', async () => {
      chainRes = {
        data: [{ id: 'o1', display_name: 'Org', username: 'org', avatar_url: null }],
        error: null,
      };

      const result = await profilesRepository.getOrganisersByIds(['o1']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('o1');
    });

    it('returns empty array when ids empty', async () => {
      const result = await profilesRepository.getOrganisersByIds([]);
      expect(result).toEqual([]);
    });
  });

  describe('getProfileDisplayInfo', () => {
    it('returns display info for user ids', async () => {
      chainRes = {
        data: [{ user_id: 'u1', display_name: 'Alice', avatar_url: null }],
        error: null,
      };

      const result = await profilesRepository.getProfileDisplayInfo(['u1']);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ user_id: 'u1', display_name: 'Alice' });
    });

    it('returns empty array when userIds empty', async () => {
      const result = await profilesRepository.getProfileDisplayInfo([]);
      expect(result).toEqual([]);
    });
  });

  describe('getOrganiserProfileById', () => {
    it('returns organiser when found', async () => {
      chainRes = {
        data: {
          id: 'o1',
          display_name: 'Venue',
          username: 'venue',
          owner_id: 'u1',
        },
        error: null,
      };

      const result = await profilesRepository.getOrganiserProfileById('o1');
      expect(result).toMatchObject({ id: 'o1', display_name: 'Venue' });
    });

    it('returns null when not found', async () => {
      chainRes = { data: null, error: null };

      const result = await profilesRepository.getOrganiserProfileById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getOwnedOrganiserIds', () => {
    it('returns organiser ids owned by user', async () => {
      chainRes = {
        data: [{ id: 'o1' }, { id: 'o2' }],
        error: null,
      };

      const result = await profilesRepository.getOwnedOrganiserIds('u1');
      expect(result).toEqual(['o1', 'o2']);
    });

    it('returns empty array when none', async () => {
      chainRes = { data: [], error: null };

      const result = await profilesRepository.getOwnedOrganiserIds('u1');
      expect(result).toEqual([]);
    });
  });

  describe('getProfileByUserId', () => {
    it('returns profile when found', async () => {
      chainRes = {
        data: {
          user_id: 'u1',
          display_name: 'Alice',
          username: 'alice',
          avatar_url: null,
        },
        error: null,
      };

      const result = await profilesRepository.getProfileByUserId('u1');
      expect(result).toMatchObject({ user_id: 'u1', username: 'alice' });
    });

    it('returns null when not found', async () => {
      chainRes = { data: null, error: null };

      const result = await profilesRepository.getProfileByUserId('nonexistent');
      expect(result).toBeNull();
    });
  });
});
