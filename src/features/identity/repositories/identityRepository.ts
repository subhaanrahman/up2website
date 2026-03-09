// Identity repository — DB access layer

import { supabase } from '@/infrastructure/supabase';
import { callEdgeFunction } from '@/infrastructure/api-client';
import type { UserProfile } from '../domain/types';

function mapRow(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    displayName: row.display_name as string | null,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    username: row.username as string | null,
    email: row.email as string | null,
    avatarUrl: row.avatar_url as string | null,
    bio: row.bio as string | null,
    city: row.city as string | null,
    pageClassification: row.page_classification as string | null,
    instagramHandle: row.instagram_handle as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const identityRepository = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    // Direct query — Supabase client handles auth headers automatically.
    // No need for explicit getSession() call.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return mapRow(data);
    }

    // Fallback for dev-login or RLS-blocked scenarios
    if (error) {
      try {
        const fallback = await callEdgeFunction<Record<string, unknown> | null>('dev-profile', {
          method: 'POST',
          body: { user_id: userId },
        });
        return fallback ? mapRow(fallback) : null;
      } catch {
        return null;
      }
    }

    return null;
  },

  // Avatar upload is now handled by the avatar-upload Edge Function.
  // Profile writes go through the profile-update Edge Function.
};
