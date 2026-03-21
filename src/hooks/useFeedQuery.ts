import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfileQuery';
import {
  buildFeedContext,
  fetchFeedPage,
  fetchPublicFeedPage,
  fetchNearbyEvents,
  type FeedContext,
  type FeedPage,
} from '@/features/social';

// ─── Feed context (social graph, cached per user) ───
export function useFeedContext() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['feed-context', user?.id ?? 'anon'],
    queryFn: () => buildFeedContext(user?.id ?? null),
    staleTime: 5 * 60 * 1000, // 5 min — social graph doesn't change often
    gcTime: 10 * 60 * 1000,
    retry: 2, // Avoid endless spinning on RLS/network failures
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// ─── Paginated feed ───
export function usePaginatedFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: ctx } = useFeedContext();

  const query = useInfiniteQuery<FeedPage>({
    queryKey: ['feed-posts', user?.id ?? 'anon'],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | null;
      if (!user) return fetchPublicFeedPage(cursor);
      if (!ctx) {
        // Context not loaded yet — fetch public as fallback
        return fetchPublicFeedPage(cursor);
      }
      return fetchFeedPage(ctx, cursor);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: true, // works for both auth and anon
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  /** Debounce Realtime bursts so any `posts` / `post_reposts` write does not refetch the full infinite feed immediately. */
  const feedInvalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FEED_REALTIME_DEBOUNCE_MS = 2500;

  useEffect(() => {
    const scheduleFeedInvalidate = () => {
      if (feedInvalidateTimerRef.current) clearTimeout(feedInvalidateTimerRef.current);
      feedInvalidateTimerRef.current = setTimeout(() => {
        feedInvalidateTimerRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      }, FEED_REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('home-feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, scheduleFeedInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reposts' }, scheduleFeedInvalidate)
      .subscribe();

    return () => {
      if (feedInvalidateTimerRef.current) clearTimeout(feedInvalidateTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Flatten pages into a single array
  const posts = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap(p => p.posts);
  }, [query.data]);

  return {
    posts,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

// ─── Nearby events (DB-backed) ───
export function useNearbyEvents(limit = 4) {
  const { data: profile } = useProfile(useAuth().user?.id);

  return useQuery({
    queryKey: ['nearby-events', profile?.city ?? 'global'],
    queryFn: () => fetchNearbyEvents(profile?.city ?? null, limit),
    staleTime: 2 * 60 * 1000,
  });
}
