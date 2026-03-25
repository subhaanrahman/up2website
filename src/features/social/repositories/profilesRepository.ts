import { supabase } from '@/infrastructure/supabase';
import { buildDualColumnIlikeOr } from '@/utils/postgrest-ilike';
import { connectionsRepository } from './connectionsRepository';

export const profilesRepository = {
  /**
   * Search accepted connections by name (RLS allows viewing friend profiles).
   * Use for collaborator pickers; global `searchProfiles` often returns nothing after privacy migrations.
   */
  async searchProfilesAmongConnections(
    term: string,
    currentUserId: string,
    opts?: { excludeUserId?: string; limit?: number },
  ) {
    const friendIds = [...(await connectionsRepository.getFriendIds(currentUserId))];
    if (friendIds.length === 0) return [];
    const orFilter = buildDualColumnIlikeOr(['display_name', 'username'], term);
    let query = supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .in('user_id', friendIds)
      .or(orFilter);
    if (opts?.excludeUserId) {
      query = query.neq('user_id', opts.excludeUserId);
    }
    query = query.limit(opts?.limit ?? 10);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async searchProfiles(term: string, opts?: { excludeUserId?: string; limit?: number }) {
    const orFilter = buildDualColumnIlikeOr(['display_name', 'username'], term);
    let query = supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .or(orFilter);
    if (opts?.excludeUserId) {
      query = query.neq('user_id', opts.excludeUserId);
    }
    query = query.limit(opts?.limit ?? 10);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async searchOrganisers(term: string, opts?: { limit?: number; includeOwner?: boolean }) {
    const orFilter = buildDualColumnIlikeOr(['display_name', 'username'], term);
    const fields = opts?.includeOwner
      ? 'id, display_name, username, avatar_url, owner_id'
      : 'id, display_name, username, avatar_url';
    const { data, error } = await supabase
      .from('organiser_profiles')
      .select(fields)
      .or(orFilter)
      .limit(opts?.limit ?? 10);
    if (error) throw error;
    return data || [];
  },

  async getProfilesByIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url, is_verified')
      .in('user_id', userIds);
    if (error) throw error;
    return data || [];
  },

  async getOrganisersByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('organiser_profiles')
      .select('id, display_name, username, avatar_url')
      .in('id', ids);
    if (error) throw error;
    return data || [];
  },

  async getProfileDisplayInfo(userIds: string[]) {
    if (userIds.length === 0) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);
    if (error) throw error;
    return data || [];
  },

  async getOrganiserProfileById(id: string) {
    const { data, error } = await supabase
      .from('organiser_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getOwnedOrganiserIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('organiser_profiles')
      .select('id')
      .eq('owner_id', userId);
    if (error) throw error;
    return (data || []).map(o => o.id);
  },

  async getProfileByUserId(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
