import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfile, useUpdateProfile, useUploadAvatar } from './useProfileQuery';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/features/identity', () => ({
  identityService: {
    getProfileOrNull: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}));

import { identityService } from '@/features/identity';

const mockIdentityService = identityService as {
  getProfileOrNull: ReturnType<typeof vi.fn>;
  updateProfile: ReturnType<typeof vi.fn>;
  uploadAvatar: ReturnType<typeof vi.fn>;
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useProfileQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useProfile', () => {
    it('fetches profile when userId is set', async () => {
      const mockProfile = { user_id: 'user-1', display_name: 'Test User' };
      mockIdentityService.getProfileOrNull.mockResolvedValue(mockProfile);

      const { result } = renderHook(() => useProfile('user-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProfile);
      expect(mockIdentityService.getProfileOrNull).toHaveBeenCalledWith('user-1');
    });

    it('does not fetch when userId is undefined', () => {
      renderHook(() => useProfile(undefined), { wrapper: createWrapper() });
      expect(mockIdentityService.getProfileOrNull).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateProfile', () => {
    it('calls identityService.updateProfile on mutate', async () => {
      mockIdentityService.updateProfile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ displayName: 'New Name' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockIdentityService.updateProfile).toHaveBeenCalledWith('user-1', {
        displayName: 'New Name',
      });
    });
  });

  describe('useUploadAvatar', () => {
    it('calls identityService.uploadAvatar on mutate', async () => {
      const file = new File(['x'], 'avatar.png', { type: 'image/png' });
      mockIdentityService.uploadAvatar.mockResolvedValue('https://example.com/avatar.png');

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(file);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockIdentityService.uploadAvatar).toHaveBeenCalledWith(file);
    });
  });
});
