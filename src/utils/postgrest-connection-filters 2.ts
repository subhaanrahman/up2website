/**
 * PostgREST `.or()` fragments for `connections` queries.
 * UUIDs must be double-quoted — unquoted values break parsing at hyphens.
 */

/** User appears as requester OR addressee on an accepted (or any) connection row. */
export function connectionsParticipantOr(userId: string): string {
  return `requester_id.eq."${userId}",addressee_id.eq."${userId}"`;
}

/** A row linking exactly these two users (either direction). */
export function connectionsBetweenUsersOr(userIdA: string, userIdB: string): string {
  return `and(requester_id.eq."${userIdA}",addressee_id.eq."${userIdB}"),and(requester_id.eq."${userIdB}",addressee_id.eq."${userIdA}")`;
}
