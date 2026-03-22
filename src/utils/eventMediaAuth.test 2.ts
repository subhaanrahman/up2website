import { describe, it, expect } from 'vitest';
import { isEventMediaManager } from '../../supabase/functions/_shared/event-media-auth';

describe('isEventMediaManager', () => {
  it('allows host', () => {
    expect(isEventMediaManager({ userId: 'u1', hostId: 'u1' })).toBe(true);
  });

  it('allows organiser owner', () => {
    expect(isEventMediaManager({ userId: 'u1', hostId: 'u2', organiserOwnerId: 'u1' })).toBe(true);
  });

  it('allows organiser member', () => {
    expect(isEventMediaManager({ userId: 'u1', hostId: 'u2', organiserOwnerId: 'u3', isOrganiserMember: true })).toBe(true);
  });

  it('denies unrelated user', () => {
    expect(isEventMediaManager({ userId: 'u1', hostId: 'u2', organiserOwnerId: 'u3', isOrganiserMember: false })).toBe(false);
  });
});
