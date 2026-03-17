/**
 * Client-side validation limits (must match backend where applicable)
 */
export const LIMITS = {
  bio: 500,
  eventDescription: 2000,
  postContent: 5000,
  messageContent: 5000,
  displayName: 100,
  eventTitle: 200,
} as const;

export function validateMaxLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function truncateToMax(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}
