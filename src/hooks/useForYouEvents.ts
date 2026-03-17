import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfileQuery';
import { fetchForYouEvents } from '@/features/social/services/feedService';

/**
 * "For You" recommendations via feedService:
 * 1. Events in user's city
 * 2. Events friends are attending
 * 3. Events from followed organisers
 * 4. Backfill with upcoming events
 */
export function useForYouEvents(limit = 15) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  return useQuery({
    queryKey: ['for-you-events', user?.id, profile?.city],
    queryFn: () => fetchForYouEvents(user?.id ?? null, profile?.city ?? null, limit),
    enabled: !!user,
  });
}
