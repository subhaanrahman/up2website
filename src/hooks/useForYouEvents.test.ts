import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForYouEvents } from './useForYouEvents';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useProfileQuery', () => ({
  useProfile: () => ({ data: { city: 'Sydney' } }),
}));

const mockFetchForYouEvents = vi.fn();
vi.mock('@/features/social/services/feedService', () => ({
  fetchForYouEvents: (...args: unknown[]) => mockFetchForYouEvents(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useForYouEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns events from fetchForYouEvents', async () => {
    const mockEvents = [{ id: 'e1', title: 'Event 1' }];
    mockFetchForYouEvents.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useForYouEvents(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockEvents);
    expect(mockFetchForYouEvents).toHaveBeenCalledWith('user-1', 'Sydney', 15);
  });

  it('passes custom limit', async () => {
    mockFetchForYouEvents.mockResolvedValue([]);

    renderHook(() => useForYouEvents(25), { wrapper: createWrapper() });

    await waitFor(() => expect(mockFetchForYouEvents).toHaveBeenCalledWith('user-1', 'Sydney', 25));
  });
});
