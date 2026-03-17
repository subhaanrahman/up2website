import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserPosts, useOrganiserPosts } from './usePostsQuery';

function createSupabaseChain() {
  const chain: Record<string, unknown> = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    in: () => chain,
    then: (cb: (r: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(cb({ data: [], error: null })),
  };
  return chain;
}

vi.mock('@/infrastructure/supabase', () => ({
  supabase: createSupabaseChain(),
}));

vi.mock('@/features/social/repositories/connectionsRepository', () => ({
  connectionsRepository: { getBlockedUserIds: vi.fn().mockResolvedValue(new Set()) },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('usePostsQuery', () => {
  describe('useUserPosts', () => {
    it('fetches when authorId is set', async () => {
      const { result } = renderHook(() => useUserPosts('author-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
    });

    it('does not fetch when authorId is undefined', () => {
      const { result } = renderHook(() => useUserPosts(undefined), { wrapper: createWrapper() });
      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useOrganiserPosts', () => {
    it('fetches when organiserProfileId is set', async () => {
      const { result } = renderHook(() => useOrganiserPosts('org-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
