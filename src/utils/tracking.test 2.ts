import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getValidReferralClickId, storeReferralClick } from './tracking';

const now = new Date('2026-03-19T10:00:00Z');

describe('tracking utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and returns a valid referral click id', () => {
    storeReferralClick('event_1', 'click_1', now.toISOString());
    const result = getValidReferralClickId('event_1');
    expect(result).toBe('click_1');
  });

  it('expires old referral click ids', () => {
    storeReferralClick('event_2', 'click_2', new Date('2026-03-01T10:00:00Z').toISOString());
    const result = getValidReferralClickId('event_2');
    expect(result).toBeNull();
  });
});
