// Identity repository — DB access layer

import { supabase } from '@/infrastructure/supabase';
import type { UserProfile } from '../domain/types';

function mapRow(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    displayName: row.display_name as string | null,
    username: row.username as string | null,
    avatarUrl: row.avatar_url as string | null,
    bio: row.bio as string | null,
    city: row.city as string | null,
    pageClassification: row.page_classification as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const identityRepository = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data) : null;
  },

  async updateProfile(userId: string, updates: Record<string, unknown>) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    return `${publicUrl}?t=${Date.now()}`;
  },
};
