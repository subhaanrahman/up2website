import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTicketTiers } from './useTicketTiers';

function createChain(res: { data: unknown[]; error: null }) {
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    then: (cb: (r: { data: unknown[]; error: null }) => unknown) => Promise.resolve(cb(res)),
  };
  return chain;
}

vi.mock('@/infrastructure/supabase', () => ({
  supabase: {
    from: () => createChain({ data: [], error: null }),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useTicketTiers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches tiers when eventId is set', async () => {
    const { result } = renderHook(() => useTicketTiers('event-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when eventId is undefined', () => {
    const { result } = renderHook(() => useTicketTiers(undefined), { wrapper: createWrapper() });
    expect(result.current.isFetching).toBe(false);
  });
});
