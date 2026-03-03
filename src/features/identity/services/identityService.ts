// Identity service — business logic

import { identityRepository } from '../repositories/identityRepository';
import type { UserProfile, UpdateProfileInput } from '../domain/types';
import { createLogger } from '@/infrastructure/logger';
import { NotFoundError, ValidationError } from '@/infrastructure/errors';
import { profileApi } from '@/api';
import { supabase } from '@/infrastructure/supabase';

const logger = createLogger('identity.service');

export const identityService = {
  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await identityRepository.getProfile(userId);
    if (!profile) throw new NotFoundError('Profile');
    return profile;
  },

  async getProfileOrNull(userId: string): Promise<UserProfile | null> {
    return identityRepository.getProfile(userId);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
    logger.info('Updating profile', { userId });

    const updates: Record<string, unknown> = {};
    if (input.displayName !== undefined) updates.display_name = input.displayName;
    if (input.username !== undefined) updates.username = input.username || null;
    if (input.bio !== undefined) updates.bio = input.bio || null;
    if (input.city !== undefined) updates.city = input.city || null;
    if (input.pageClassification !== undefined) updates.page_classification = input.pageClassification || null;
    if (input.instagramHandle !== undefined) updates.instagram_handle = input.instagramHandle || null;
    if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;

    // Check if we have a real Supabase session; if not (mock login), use direct client
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await profileApi.update(updates);
    } else {
      // Fallback for mock/dev login — write directly via client
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);
      if (error) throw error;
    }
  },

  async uploadAvatar(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new ValidationError('File must be an image');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new ValidationError('Image must be smaller than 5MB');
    }

    return profileApi.uploadAvatar(file);
  },
};
