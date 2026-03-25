import { describe, it, expect } from 'vitest';
import { dedupeAndCapInviteUserIds, HOST_RSVP_INVITE_MAX } from './hostRsvpInvite';

describe('hostRsvpInvite', () => {
  it('dedupes and preserves first-seen order up to cap', () => {
    const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const c = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    expect(dedupeAndCapInviteUserIds([a, b, a, c], 2)).toEqual([a, b]);
  });

  it('defaults to HOST_RSVP_INVITE_MAX', () => {
    const ids = Array.from({ length: 30 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    );
    expect(dedupeAndCapInviteUserIds(ids)).toHaveLength(HOST_RSVP_INVITE_MAX);
  });
});
