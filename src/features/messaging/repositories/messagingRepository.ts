import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

const log = createLogger('messaging.repository');

export const messagingRepository = {
  // ─── Group Chats ───

  async getGroupChat(chatId: string) {
    const { data, error } = await supabase
      .from('group_chats')
      .select('*')
      .eq('id', chatId)
      .single();
    if (error) throw error;
    return data;
  },

  async getGroupMessages(chatId: string) {
    const { data, error } = await supabase
      .from('group_chat_messages')
      .select('*')
      .eq('group_chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async sendGroupMessage(params: {
    groupChatId: string;
    senderId: string;
    senderName: string;
    content: string;
  }) {
    log.info('sendGroupMessage', { groupChatId: params.groupChatId, senderId: params.senderId });
    const { error } = await supabase.from('group_chat_messages').insert({
      group_chat_id: params.groupChatId,
      sender_id: params.senderId,
      sender_name: params.senderName,
      content: params.content,
      is_from_current_user: true,
    });
    if (error) throw error;
  },

  async getGroupMembers(groupChatId: string, excludeUserId?: string) {
    let query = supabase
      .from('group_chat_members')
      .select('user_id')
      .eq('group_chat_id', groupChatId);
    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async addGroupMembers(chatId: string, userIds: string[]) {
    if (userIds.length === 0) return;
    log.info('addGroupMembers', { chatId, count: userIds.length });
    const { error } = await supabase
      .from('group_chat_members')
      .insert(userIds.map(uid => ({ group_chat_id: chatId, user_id: uid })));
    if (error) throw error;
  },

  async removeGroupMember(chatId: string, userId: string) {
    log.info('removeGroupMember', { chatId, userId });
    const { error } = await supabase
      .from('group_chat_members')
      .delete()
      .eq('group_chat_id', chatId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async updateGroupMemberCount(chatId: string, newCount: number) {
    log.info('updateGroupMemberCount', { chatId, newCount });
    const { error } = await supabase
      .from('group_chats')
      .update({ member_count: newCount })
      .eq('id', chatId);
    if (error) throw error;
  },

  async updateGroupChatName(chatId: string, name: string) {
    log.info('updateGroupChatName', { chatId });
    const { error } = await supabase
      .from('group_chats')
      .update({ name })
      .eq('id', chatId);
    if (error) throw error;
  },

  async getGroupChatIdsForUser(userId: string) {
    const { data, error } = await supabase
      .from('group_chat_members')
      .select('group_chat_id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map(m => m.group_chat_id);
  },

  async getGroupChatsByIds(chatIds: string[]) {
    if (chatIds.length === 0) return [];
    const { data, error } = await supabase
      .from('group_chats')
      .select('*')
      .in('id', chatIds)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getLatestGroupMessage(chatId: string) {
    const { data, error } = await supabase
      .from('group_chat_messages')
      .select('sender_name, content, created_at')
      .eq('group_chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  },

  // ─── DMs ───

  async getDmThread(threadId: string) {
    const { data, error } = await supabase
      .from('dm_threads')
      .select('*')
      .eq('id', threadId)
      .single();
    if (error) throw error;
    return data;
  },

  async getDmMessages(threadId: string) {
    const { data, error } = await supabase
      .from('dm_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async sendDm(params: { threadId: string; senderId: string; content: string }) {
    log.info('sendDm', { threadId: params.threadId, senderId: params.senderId });
    const { error } = await supabase.from('dm_messages').insert({
      thread_id: params.threadId,
      sender_id: params.senderId,
      content: params.content,
    });
    if (error) throw error;
  },

  async listDmThreads(params: {
    mode: 'user' | 'organiser';
    userId: string;
    organiserProfileIds?: string[];
  }) {
    let query = supabase
      .from('dm_threads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (params.mode === 'user') {
      query = query.eq('user_id', params.userId);
    } else if (params.organiserProfileIds && params.organiserProfileIds.length > 0) {
      query = query.in('organiser_profile_id', params.organiserProfileIds);
    } else {
      return [];
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getLatestDmMessages(threadIds: string[]) {
    if (threadIds.length === 0) return [];
    const { data, error } = await supabase
      .from('dm_messages')
      .select('thread_id, content, created_at')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getDmThreadByParticipants(userId: string, organiserProfileId: string) {
    const { data, error } = await supabase
      .from('dm_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('organiser_profile_id', organiserProfileId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createDmThread(userId: string, organiserProfileId: string) {
    log.info('createDmThread', { userId, organiserProfileId });
    const { data, error } = await supabase
      .from('dm_threads')
      .insert({ user_id: userId, organiser_profile_id: organiserProfileId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Event Board ───

  async getEventMessages(eventId: string) {
    const { data, error } = await supabase
      .from('event_messages')
      .select('id, content, created_at, user_id')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async sendEventMessage(params: { eventId: string; userId: string; content: string }) {
    log.info('sendEventMessage', { eventId: params.eventId, userId: params.userId });
    const { error } = await supabase.from('event_messages').insert({
      event_id: params.eventId,
      user_id: params.userId,
      content: params.content,
    });
    if (error) throw error;
  },

  async deleteEventMessage(messageId: string) {
    log.info('deleteEventMessage', { messageId });
    const { error } = await supabase.from('event_messages').delete().eq('id', messageId);
    if (error) throw error;
  },
};
