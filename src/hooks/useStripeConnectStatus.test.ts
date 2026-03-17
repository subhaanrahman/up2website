import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStripeConnectStatus } from './useStripeConnectStatus';

vi.mock('@/infrastructure/api-client', () => ({
  callEdgeFunction: vi.fn(),
}));

import { callEdgeFunction } from '@/infrastructure/api-client';

const mockCallEdgeFunction = callEdgeFunction as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useStripeConnectStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches status when organiserProfileId is set', async () => {
    const mockStatus = {
      connected: true,
      onboarding_complete: true,
      charges_enabled: true,
      payouts_enabled: true,
    };
    mockCallEdgeFunction.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useStripeConnectStatus('org-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockStatus);
    expect(mockCallEdgeFunction).toHaveBeenCalledWith('stripe-connect-status', {
      body: { organiser_profile_id: 'org-1' },
    });
  });

  it('does not fetch when organiserProfileId is undefined', () => {
    const { result } = renderHook(() => useStripeConnectStatus(undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
  });
});
