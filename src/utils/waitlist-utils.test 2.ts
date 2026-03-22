import { describe, it, expect } from 'vitest';
import { computeWaitlistPositions, selectWaitlistPromotions } from '../../supabase/functions/_shared/waitlist-utils';

describe('waitlist-utils', () => {
  it('computes contiguous positions by created_at', () => {
    const entries = [
      { id: 'a', created_at: '2026-03-19T10:00:00Z' },
      { id: 'b', created_at: '2026-03-19T09:00:00Z' },
      { id: 'c', created_at: '2026-03-19T11:00:00Z' },
    ];

    const positions = computeWaitlistPositions(entries);
    expect(positions).toEqual([
      { id: 'b', position: 1 },
      { id: 'a', position: 2 },
      { id: 'c', position: 3 },
    ]);
  });

  it('selects earliest waitlist promotions', () => {
    const entries = [
      { id: 'a', created_at: '2026-03-19T10:00:00Z' },
      { id: 'b', created_at: '2026-03-19T09:00:00Z' },
      { id: 'c', created_at: '2026-03-19T11:00:00Z' },
    ];

    const promoted = selectWaitlistPromotions(entries, 2);
    expect(promoted.map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('returns empty when no spots', () => {
    const entries = [{ id: 'a', created_at: '2026-03-19T10:00:00Z' }];
    expect(selectWaitlistPromotions(entries, 0)).toEqual([]);
  });
});
