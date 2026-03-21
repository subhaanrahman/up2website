import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeConnectStatus } from './useStripeConnectStatus';

const defaultAuth = {
  user: { id: 'test-user' } as { id: string },
  session: null,
  loading: false,
  checkPhone: async () => ({ exists: false, error: null }),
  sendOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null, loggedIn: false }),
  register: async () => ({ error: null }),
  login: async () => ({ error: null }),
  signOut: async () => {},
  devLogin: async () => ({ error: null }),
  resetPasswordForEmail: async () => ({ error: null }),
  forgotPasswordCheck: async () => ({ result: null, error: null }),
  forgotPasswordReset: async () => ({ error: null }),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => defaultAuth),
}));

vi.mock('@/infrastructure/api-client', () => ({
  callEdgeFunction: vi.fn(),
}));

import { callEdgeFunction } from '@/infrastructure/api-client';

const mockCallEdgeFunction = callEdgeFunction as ReturnType<typeof vi.fn>;
const mockUseAuth = vi.mocked(useAuth);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useStripeConnectStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuth as ReturnType<typeof useAuth>);
  });

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

  it('does not fetch when auth is still loading', () => {
    mockUseAuth.mockReturnValueOnce({
      ...defaultAuth,
      user: null,
      loading: true,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useStripeConnectStatus('org-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
    expect(mockCallEdgeFunction).not.toHaveBeenCalled();
  });

  it('does not fetch when user is null', () => {
    mockUseAuth.mockReturnValueOnce({
      ...defaultAuth,
      user: null,
      loading: false,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useStripeConnectStatus('org-1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
    expect(mockCallEdgeFunction).not.toHaveBeenCalled();
  });
});
