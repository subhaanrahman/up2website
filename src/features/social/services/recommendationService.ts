/**
 * Recommendation Service
 * Centralised logic for friend suggestions, feed ranking, and discovery.
 * Currently rule-based; designed to be swapped for ML-backed scoring later.
 */

import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('recommendation.service');

export interface SuggestedProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

/**
 * Suggest friends for a user, excluding:
 *  - the user themselves
 *  - anyone already connected (pending or accepted)
 *
 * Current algorithm: most recently created profiles first (simple recency).
 * Future: mutual-friend scoring, event co-attendance, city proximity, etc.
 */
export async function getSuggestedFriends(
  userId: string | undefined,
  limit = 6,
): Promise<SuggestedProfile[]> {
  // 1. Fetch candidate profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, username, avatar_url')
    .order('created_at', { ascending: false })
    .limit(limit + 20); // over-fetch to allow filtering

  if (!profiles) return [];

  let candidates = profiles as SuggestedProfile[];

  // 2. Remove the current user
  if (userId) {
    candidates = candidates.filter((p) => p.user_id !== userId);
  }

  // 3. Remove existing connections (pending, accepted, or any status)
  if (userId) {
    const { data: connections } = await supabase
      .from('connections')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (connections && connections.length > 0) {
      const connectedIds = new Set<string>();
      for (const c of connections) {
        if (c.requester_id === userId) connectedIds.add(c.addressee_id);
        else connectedIds.add(c.requester_id);
      }
      candidates = candidates.filter((p) => !connectedIds.has(p.user_id));
    }
  }

  return candidates.slice(0, limit);
}

// Feed ranking has been moved to feedService.ts with weighted deterministic scoring.
// See: src/features/social/services/feedService.ts
