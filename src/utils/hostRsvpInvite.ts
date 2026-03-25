/** Max invitees per host RSVP batch (matches Edge + RPC). */
export const HOST_RSVP_INVITE_MAX = 25;

/** Dedupe UUIDs and cap length for bulk-invite payloads. */
export function dedupeAndCapInviteUserIds(userIds: string[], max: number = HOST_RSVP_INVITE_MAX): string[] {
  return [...new Set(userIds)].slice(0, max);
}
