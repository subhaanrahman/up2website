// React Query hooks for identity/profile

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { identityService } from '@/features/identity';
import type { UpdateProfileInput } from '@/features/identity';
import { useAuth } from '@/contexts/AuthContext';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (userId: string) => [...profileKeys.all, userId] as const,
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? profileKeys.detail(userId) : [...profileKeys.all, 'anon'],
    queryFn: () => identityService.getProfileOrNull(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 min — profile doesn't change often
    gcTime: 10 * 60 * 1000, // 10 min cache
    retry: 2, // 3 total attempts; avoid endless spinning on RLS/network failures
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => {
      if (!user) throw new Error('Not authenticated');
      return identityService.updateProfile(user.id, input);
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
    },
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      if (!user) throw new Error('Not authenticated');
      return identityService.uploadAvatar(file);
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: profileKeys.detail(user.id) });
    },
  });
}
