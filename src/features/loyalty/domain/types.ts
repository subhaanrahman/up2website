// Loyalty domain types (re-exported from legacy gamification for compatibility)

export type UserRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type PointAction =
  | 'add_friend'
  | 'save_event'
  | 'like_post'
  | 'follow_organiser'
  | 'share_event'
  | 'rsvp_event'
  | 'buy_ticket'
  | 'create_event'
  | 'app_review';

export interface UserPoints {
  totalPoints: number;
  currentRank: UserRank;
}

export interface Voucher {
  id: string;
  code: string;
  valueCents: number;
  status: string;
  earnedAtRank: UserRank;
  expiresAt: string | null;
  usedAt: string | null;
}

export interface PointTransaction {
  id: string;
  points: number;
  actionType: string;
  description: string | null;
  createdAt: string;
}

export interface AwardPointsResult {
  awarded: number;
  leveledUp: boolean;
  newRank: string;
  newTotal: number;
}

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

export function getNextRank(currentRank: UserRank): UserRank | null {
  const idx = RANK_ORDER.indexOf(currentRank);
  return idx === RANK_ORDER.length - 1 ? null : RANK_ORDER[idx + 1];
}

export function getPointsToNextRank(totalPoints: number, currentRank: UserRank): number {
  const next = getNextRank(currentRank);
  return next ? RANK_THRESHOLDS[next] - totalPoints : 0;
}

export function getProgressToNextRank(totalPoints: number, currentRank: UserRank): number {
  const next = getNextRank(currentRank);
  if (!next) return 100;
  const cur = RANK_THRESHOLDS[currentRank];
  const nxt = RANK_THRESHOLDS[next];
  return Math.min(100, ((totalPoints - cur) / (nxt - cur)) * 100);
}
