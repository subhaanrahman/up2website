import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents, useSearchEvents, useEvent } from './useEventsQuery';

vi.mock('@/features/events', () => ({
  eventsService: {
    listEvents: vi.fn(),
    searchEvents: vi.fn(),
    getEvent: vi.fn(),
  },
}));

import { eventsService } from '@/features/events';

const { listEvents: mockListEvents, searchEvents: mockSearchEvents, getEvent: mockGetEvent } =
  eventsService as { listEvents: ReturnType<typeof vi.fn>; searchEvents: ReturnType<typeof vi.fn>; getEvent: ReturnType<typeof vi.fn> };

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useEventsQuery', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('useEvents', () => {
    it('returns events from eventsService.listEvents', async () => {
      const mockEvents = [{ id: 'e1', title: 'Event 1' }];
      mockListEvents.mockResolvedValue(mockEvents);

      const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockEvents);
      expect(mockListEvents).toHaveBeenCalledWith(undefined);
    });

    it('passes limit to listEvents', async () => {
      mockListEvents.mockResolvedValue([]);

      renderHook(() => useEvents({ limit: 10 }), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockListEvents).toHaveBeenCalledWith({ limit: 10 });
      });
    });
  });

  describe('useSearchEvents', () => {
    it('calls searchEvents with filter and city', async () => {
      mockSearchEvents.mockResolvedValue([]);

      renderHook(
        () => useSearchEvents({ filter: 'tonight', city: 'Sydney', limit: 20 }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockSearchEvents).toHaveBeenCalledWith({
          filter: 'tonight',
          city: 'Sydney',
          limit: 20,
        });
      });
    });
  });

  describe('useEvent', () => {
    it('fetches event when id is set', async () => {
      const mockEvent = { id: 'e1', title: 'Event 1' };
      mockGetEvent.mockResolvedValue(mockEvent);

      const { result } = renderHook(() => useEvent('e1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockEvent);
    });

    it('does not fetch when id is undefined', () => {
      renderHook(() => useEvent(undefined), { wrapper: createWrapper() });
      expect(mockGetEvent).not.toHaveBeenCalled();
    });
  });
});
