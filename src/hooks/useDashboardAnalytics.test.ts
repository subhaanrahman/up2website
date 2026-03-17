import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardAnalytics } from './useDashboardAnalytics';

const mockInvoke = vi.fn();

vi.mock('@/infrastructure/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useDashboardAnalytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches analytics when organiserProfileId is set', async () => {
    const mockAnalytics = {
      total_revenue_cents: 10000,
      total_attendees: 50,
      net_tickets_sold: 50,
      total_ticket_capacity: 100,
      tickets_sold_pct: 50,
      total_views: 200,
      conversion_rate_pct: 25,
      follower_count: 100,
      vip_guestlist_count: 10,
      timeframe: '30d',
    };
    mockInvoke.mockResolvedValue({ data: mockAnalytics, error: null });

    const { result } = renderHook(
      () => useDashboardAnalytics('org-1', '30d'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAnalytics);
  });

  it('does not fetch when organiserProfileId is undefined', () => {
    const { result } = renderHook(
      () => useDashboardAnalytics(undefined, '30d'),
      { wrapper: createWrapper() },
    );
    expect(result.current.isFetching).toBe(false);
  });
});
