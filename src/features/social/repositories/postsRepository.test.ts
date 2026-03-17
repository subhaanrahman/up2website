import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postsRepository } from './postsRepository';

let chainRes: { data: unknown; error: unknown } = { data: [], error: null };

function createChain() {
  const res = chainRes;
  const chain = {
    from: () => chain,
    select: () => chain,
    insert: () => chain,
    delete: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    lt: () => chain,
    in: () => chain,
    single: () => chain,
    then: (cb: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

vi.mock('@/infrastructure/supabase', () => ({
  supabase: { from: () => createChain() },
}));

vi.mock('@/infrastructure/logger', () => ({
  createLogger: () => ({ info: vi.fn() }),
}));

describe('postsRepository', () => {
  beforeEach(() => {
    chainRes = { data: [], error: null };
  });

  describe('getPostsForFeed', () => {
    it('returns posts when data exists', async () => {
      const rows = [
        {
          id: 'p1',
          content: 'Hello',
          created_at: '2026-01-01',
          author_id: 'u1',
          organiser_profile_id: null,
          image_url: null,
          gif_url: null,
          event_id: null,
        },
      ];
      chainRes = { data: rows, error: null };

      const result = await postsRepository.getPostsForFeed(null, 10);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'p1', content: 'Hello' });
    });

    it('returns empty array when no data', async () => {
      chainRes = { data: [], error: null };
      const result = await postsRepository.getPostsForFeed(null, 10);
      expect(result).toEqual([]);
    });
  });
});
