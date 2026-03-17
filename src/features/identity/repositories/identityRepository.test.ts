import { describe, it, expect, vi, beforeEach } from 'vitest';
import { identityRepository } from './identityRepository';

let chainRes: { data: unknown; error: unknown } = { data: null, error: null };

function createChain() {
  const res = chainRes;
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => chain,
    then: (cb: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

vi.mock('@/infrastructure/supabase', () => ({
  supabase: { from: () => createChain() },
}));

vi.mock('@/infrastructure/api-client', () => ({
  callEdgeFunction: vi.fn().mockRejectedValue(new Error('fallback')),
}));

describe('identityRepository', () => {
  beforeEach(() => {
    chainRes = { data: null, error: null };
  });

  describe('getProfile', () => {
    it('returns mapped profile when found', async () => {
      const row = {
        id: 'p1',
        user_id: 'u1',
        display_name: 'Test User',
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        email: null,
        avatar_url: null,
        bio: null,
        city: 'Sydney',
        page_classification: null,
        instagram_handle: null,
        is_verified: false,
        profile_tier: 'personal',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      chainRes = { data: row, error: null };

      const result = await identityRepository.getProfile('u1');
      expect(result).toMatchObject({
        userId: 'u1',
        displayName: 'Test User',
        username: 'testuser',
        profileTier: 'personal',
      });
    });

    it('returns null when no data', async () => {
      chainRes = { data: null, error: null };
      const result = await identityRepository.getProfile('u1');
      expect(result).toBeNull();
    });
  });
});
