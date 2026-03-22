import { describe, it, expect } from 'vitest';
import { connectionsParticipantOr, connectionsBetweenUsersOr } from './postgrest-connection-filters';

describe('postgrest-connection-filters', () => {
  const uid = '1eafb563-071a-45c6-a82e-79b460b3a851';

  it('connectionsParticipantOr quotes UUID for PostgREST', () => {
    expect(connectionsParticipantOr(uid)).toBe(
      `requester_id.eq."${uid}",addressee_id.eq."${uid}"`,
    );
  });

  it('connectionsBetweenUsersOr quotes both UUIDs', () => {
    const b = 'e8f02149-2ccf-4324-950a-d2a574c46569';
    expect(connectionsBetweenUsersOr(uid, b)).toBe(
      `and(requester_id.eq."${uid}",addressee_id.eq."${b}"),and(requester_id.eq."${b}",addressee_id.eq."${uid}")`,
    );
  });
});
