// Gamification constants and utilities

export type UserRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export const RANK_THRESHOLDS: Record<UserRank, number> = {
  bronze: 0,
  silver: 1000,
  gold: 2000,
  platinum: 3000,
  diamond: 4000,
};

export const RANK_ORDER: UserRank[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

export const RANK_COLORS: Record<UserRank, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

export const RANK_LABELS: Record<UserRank, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

// Point values for different actions
export const POINT_VALUES = {
  add_friend: 5,
  save_event: 5,
  like_post: 5,
  follow_organiser: 10,
  share_event: 10,
  rsvp_event: 25,
  buy_ticket: 50,
  create_event: 50,
  app_review: 50,
} as const;

export type PointAction = keyof typeof POINT_VALUES;

export const ACTION_LABELS: Record<PointAction, string> = {
  add_friend: 'Add Friend',
  save_event: 'Save Event',
  like_post: 'Like Post',
  follow_organiser: 'Follow Organiser',
  share_event: 'Share Event',
  rsvp_event: 'RSVP to Event',
  buy_ticket: 'Buy Ticket',
  create_event: 'Create Event',
  app_review: 'App Store Review',
};

export const VOUCHER_VALUE_CENTS = 500; // $5.00

export function calculateRank(totalPoints: number): UserRank {
  if (totalPoints >= RANK_THRESHOLDS.diamond) return 'diamond';
  if (totalPoints >= RANK_THRESHOLDS.platinum) return 'platinum';
  if (totalPoints >= RANK_THRESHOLDS.gold) return 'gold';
  if (totalPoints >= RANK_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function getNextRank(currentRank: UserRank): UserRank | null {
  const currentIndex = RANK_ORDER.indexOf(currentRank);
  if (currentIndex === RANK_ORDER.length - 1) return null;
  return RANK_ORDER[currentIndex + 1];
}

export function getPointsToNextRank(totalPoints: number, currentRank: UserRank): number {
  const nextRank = getNextRank(currentRank);
  if (!nextRank) return 0;
  return RANK_THRESHOLDS[nextRank] - totalPoints;
}

export function getProgressToNextRank(totalPoints: number, currentRank: UserRank): number {
  const nextRank = getNextRank(currentRank);
  if (!nextRank) return 100;
  
  const currentThreshold = RANK_THRESHOLDS[currentRank];
  const nextThreshold = RANK_THRESHOLDS[nextRank];
  const pointsInCurrentTier = totalPoints - currentThreshold;
  const tierSize = nextThreshold - currentThreshold;
  
  return Math.min(100, (pointsInCurrentTier / tierSize) * 100);
}

export function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'REWARD-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
