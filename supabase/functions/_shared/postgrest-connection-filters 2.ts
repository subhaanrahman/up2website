/** PostgREST `.or()` for connections — UUIDs must be quoted (hyphens break unquoted filters). */

export function connectionsParticipantOr(userId: string): string {
  return `requester_id.eq."${userId}",addressee_id.eq."${userId}"`;
}

export function connectionsBetweenUsersOr(userIdA: string, userIdB: string): string {
  return `and(requester_id.eq."${userIdA}",addressee_id.eq."${userIdB}"),and(requester_id.eq."${userIdB}",addressee_id.eq."${userIdA}")`;
}
