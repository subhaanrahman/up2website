import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserPlannedEvents, useUserCreatedEvents } from './useUserEventsQuery';

function createChain(res: { data: unknown[]; error: null }) {
  const chain = {
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (cb: (r: { data: unknown[]; error: null }) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

const chain = createChain({ data: [], error: null });

vi.mock('@/infrastructure/supabase', () => ({
  supabase: {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    is: () => chain,
    order: () => chain,
  },
}));

vi.mock('@/contexts/ActiveProfileContext', () => ({
  useActiveProfile: () => ({ activeProfile: { type: 'personal', id: 'profile-1' } }),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUserEventsQuery', () => {
  describe('useUserPlannedEvents', () => {
    it('fetches when userId is set', async () => {
      const { result } = renderHook(() => useUserPlannedEvents('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('does not fetch when userId is undefined', () => {
      const { result } = renderHook(() => useUserPlannedEvents(undefined), {
        wrapper: createWrapper(),
      });
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('useUserCreatedEvents', () => {
    it('returns events when enabled', async () => {
      const { result } = renderHook(() => useUserCreatedEvents('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
