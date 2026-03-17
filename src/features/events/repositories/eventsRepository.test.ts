import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventsRepository } from './eventsRepository';

let chainRes: { data: unknown; error: unknown } = { data: [], error: null };

function createChain() {
  const res = chainRes;
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    or: () => chain,
    gte: () => chain,
    lte: () => chain,
    ilike: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => chain,
    in: () => chain,
    then: (cb: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

vi.mock('@/infrastructure/supabase', () => ({
  supabase: {
    from: () => createChain(),
  },
}));

describe('eventsRepository', () => {
  beforeEach(() => {
    chainRes = { data: [], error: null };
  });

  describe('list', () => {
    it('returns mapped events', async () => {
      const rows = [
        {
          id: 'e1',
          host_id: 'h1',
          title: 'Event 1',
          description: 'Desc',
          location: 'Sydney',
          event_date: '2026-06-01T18:00:00Z',
          end_date: null,
          cover_image: null,
          category: 'music',
          max_guests: 100,
          is_public: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];
      chainRes = { data: rows, error: null };

      const result = await eventsRepository.list();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'e1',
        hostId: 'h1',
        title: 'Event 1',
        location: 'Sydney',
        eventDate: '2026-06-01T18:00:00Z',
      });
    });

    it('returns empty array when no data', async () => {
      chainRes = { data: [], error: null };
      const result = await eventsRepository.list();
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns mapped event when found', async () => {
      const row = {
        id: 'e1',
        host_id: 'h1',
        title: 'Event 1',
        description: null,
        location: null,
        event_date: '2026-06-01T18:00:00Z',
        end_date: null,
        cover_image: null,
        category: null,
        max_guests: null,
        is_public: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      chainRes = { data: row, error: null };

      const result = await eventsRepository.getById('e1');
      expect(result).toMatchObject({ id: 'e1', title: 'Event 1' });
    });
  });

  describe('isEventSaved', () => {
    it('returns truthy when saved', async () => {
      chainRes = { data: { id: '1' }, error: null };
      const result = await eventsRepository.isEventSaved('user-1', 'e1');
      expect(result).toBeTruthy();
    });

    it('returns falsy when not saved', async () => {
      chainRes = { data: null, error: null };
      const result = await eventsRepository.isEventSaved('user-1', 'e1');
      expect(result).toBeFalsy();
    });
  });
});
