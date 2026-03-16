import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';
import { callEdgeFunction } from '@/infrastructure/api-client';

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
    await callEdgeFunction('message-send', {
      body: {
        type: 'group',
        group_chat_id: params.groupChatId,
        sender_name: params.senderName,
        content: params.content,
      },
    });
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
    await callEdgeFunction('group-chat-manage', {
      body: { action: 'add-members', chat_id: chatId, user_ids: userIds },
    });
  },

  async removeGroupMember(chatId: string, userId: string) {
    log.info('removeGroupMember', { chatId, userId });
    await callEdgeFunction('group-chat-manage', {
      body: { action: 'remove-member', chat_id: chatId, user_id: userId },
    });
  },

  async updateGroupMemberCount(_chatId: string, _newCount: number) {
    // Member count is now managed atomically by the group-chat-manage edge function.
    // This method is kept for backward compatibility but is a no-op.
  },

  async updateGroupChatName(chatId: string, name: string) {
    log.info('updateGroupChatName', { chatId });
    await callEdgeFunction('group-chat-manage', {
      body: { action: 'rename', chat_id: chatId, name },
    });
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
    await callEdgeFunction('message-send', {
      body: { type: 'dm', thread_id: params.threadId, content: params.content },
    });
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
    await callEdgeFunction('message-send', {
      body: { type: 'event-board', event_id: params.eventId, content: params.content },
    });
  },
};
