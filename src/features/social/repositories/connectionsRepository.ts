import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('connections.repository');

export const connectionsRepository = {
  async sendRequest(requesterId: string, addresseeId: string) {
    log.info('sendRequest', { requesterId, addresseeId });
    const { error } = await supabase
      .from('connections')
      .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });
    if (error) throw error;
  },

  async sendRequestAndReturn(requesterId: string, addresseeId: string) {
    log.info('sendRequestAndReturn', { requesterId, addresseeId });
    const { data, error } = await supabase
      .from('connections')
      .insert({ requester_id: requesterId, addressee_id: addresseeId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteById(connectionId: string) {
    log.info('deleteById', { connectionId });
    const { error } = await supabase.from('connections').delete().eq('id', connectionId);
    if (error) throw error;
  },

  async deleteByUsers(requesterId: string, addresseeId: string) {
    log.info('deleteByUsers', { requesterId, addresseeId });
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('requester_id', requesterId)
      .eq('addressee_id', addresseeId);
    if (error) throw error;
  },

  async acceptById(connectionId: string) {
    log.info('acceptById', { connectionId });
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', connectionId);
    if (error) throw error;
  },

  async acceptByUsers(requesterId: string, addresseeId: string) {
    log.info('acceptByUsers', { requesterId, addresseeId });
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() } as any)
      .eq('requester_id', requesterId)
      .eq('addressee_id', addresseeId);
    if (error) throw error;
  },

  async updateMuted(connectionId: string, muted: boolean) {
    log.info('updateMuted', { connectionId, muted });
    const { error } = await (supabase
      .from('connections')
      .update({ muted } as any)
      .eq('id', connectionId) as any);
    if (error) throw error;
  },

  async getFriendIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('connections')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) throw error;
    const ids = new Set<string>();
    for (const c of data || []) {
      ids.add(c.requester_id === userId ? c.addressee_id : c.requester_id);
    }
    return ids;
  },

  async getAcceptedConnections(userId: string) {
    const { data, error } = await supabase
      .from('connections')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) throw error;
    return data || [];
  },

  async getPendingRequests(addresseeId: string) {
    const { data, error } = await supabase
      .from('connections')
      .select('id, requester_id, created_at')
      .eq('addressee_id', addresseeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getConnectionBetween(userId1: string, userId2: string) {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(
        `and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`
      )
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async followOrganiser(organiserProfileId: string, userId: string) {
    log.info('followOrganiser', { organiserProfileId, userId });
    const { error } = await supabase
      .from('organiser_followers')
      .insert({ organiser_profile_id: organiserProfileId, user_id: userId });
    if (error) throw error;
  },

  async unfollowOrganiser(organiserProfileId: string, userId: string) {
    log.info('unfollowOrganiser', { organiserProfileId, userId });
    const { error } = await supabase
      .from('organiser_followers')
      .delete()
      .eq('organiser_profile_id', organiserProfileId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async updateOrganiserMuted(organiserProfileId: string, userId: string, muted: boolean) {
    log.info('updateOrganiserMuted', { organiserProfileId, userId, muted });
    const { error } = await (supabase
      .from('organiser_followers')
      .update({ muted } as any)
      .eq('organiser_profile_id', organiserProfileId)
      .eq('user_id', userId) as any);
    if (error) throw error;
  },

  async getFollowStatus(organiserProfileId: string, userId: string) {
    const { data, error } = await supabase
      .from('organiser_followers')
      .select('*')
      .eq('organiser_profile_id', organiserProfileId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getFollowedOrganiserIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('organiser_followers')
      .select('organiser_profile_id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map(f => f.organiser_profile_id);
  },

  async getBlockedUserIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    if (error) throw error;
    const ids = new Set<string>();
    for (const row of data || []) {
      ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
    }
    return ids;
  },

  async getFollowersByFriends(friendIds: string[]): Promise<string[]> {
    if (friendIds.length === 0) return [];
    const { data, error } = await supabase
      .from('organiser_followers')
      .select('organiser_profile_id')
      .in('user_id', friendIds.slice(0, 50));
    if (error) throw error;
    return (data || []).map(f => f.organiser_profile_id);
  },
};
