import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfileQuery';
import {
  buildFeedContext,
  emptyFeedContextForUser,
  fetchFeedPage,
  fetchPublicFeedPage,
  fetchNearbyEvents,
  type FeedPage,
} from '@/features/social';
import { config } from '@/infrastructure/config';

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
  const { data: ctx, isPending: ctxPending, isError: ctxError } = useFeedContext();
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);

  const graphKey = !user ? 'anon' : ctxPending ? 'ctx-wait' : ctxError ? 'ctx-err' : 'ctx-ready';

  const query = useInfiniteQuery<FeedPage>({
    queryKey: ['feed-posts', user?.id ?? 'anon', graphKey],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | null;
      if (!user) return fetchPublicFeedPage(cursor);
      const effectiveCtx = ctx ?? emptyFeedContextForUser(user.id);
      return fetchFeedPage(effectiveCtx, cursor);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !user || !ctxPending,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  /** Debounce Realtime bursts so any `posts` / `post_reposts` write does not refetch the full infinite feed immediately. */
  const feedInvalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const FEED_REALTIME_DEBOUNCE_MS = 2500;

  const refetch = useCallback(async () => {
    setHasPendingUpdates(false);
    await query.refetch();
  }, [query.refetch]);

  useEffect(() => {
    setHasPendingUpdates(false);
  }, [graphKey, user?.id]);

  useEffect(() => {
    const scheduleFeedRefreshPrompt = () => {
      if (feedInvalidateTimerRef.current) clearTimeout(feedInvalidateTimerRef.current);
      feedInvalidateTimerRef.current = setTimeout(() => {
        feedInvalidateTimerRef.current = null;
        setHasPendingUpdates(true);
      }, FEED_REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('home-feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, scheduleFeedRefreshPrompt)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reposts' }, scheduleFeedRefreshPrompt)
      .subscribe();

    return () => {
      if (feedInvalidateTimerRef.current) clearTimeout(feedInvalidateTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  // Flatten pages into a single array
  const posts = useMemo(() => {
    if (!query.data) return [];
    const all = query.data.pages.flatMap(p => p.posts);
    const seen = new Set<string>();
    const deduped = [];
    for (const post of all) {
      const key = (post as any)._feedKey || post.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(post);
    }
    return deduped;
  }, [query.data]);

  return {
    posts,
    isLoading: (!!user && ctxPending) || query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch,
    isRefetching: query.isRefetching,
    hasPendingUpdates,
  };
}

// ─── Nearby events (DB-backed) ───
export function useNearbyEvents(limit = 4) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  // Guests: optional VITE_DEFAULT_GUEST_CITY so carousel can scope to a region; else all public upcoming.
  const city = user ? (profile?.city ?? null) : (config.defaultGuestCity ?? null);

  return useQuery({
    queryKey: ['nearby-events', user?.id ?? 'guest', city ?? ''],
    queryFn: () => fetchNearbyEvents(city, limit),
    staleTime: 2 * 60 * 1000,
  });
}
