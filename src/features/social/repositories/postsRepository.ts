import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';
import { callEdgeFunction } from '@/infrastructure/api-client';

const log = createLogger('posts.repository');

export const postsRepository = {
  async createPost(params: {
    authorId: string;
    content: string | null;
    imageUrl?: string | null;
    gifUrl?: string | null;
    organiserProfileId?: string | null;
    eventId?: string | null;
  }) {
    log.info('createPost', { authorId: params.authorId, hasImage: !!params.imageUrl, hasGif: !!params.gifUrl });
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: params.authorId,
        content: params.content,
        image_url: params.imageUrl ?? null,
        gif_url: params.gifUrl ?? null,
        organiser_profile_id: params.organiserProfileId ?? null,
        event_id: params.eventId ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data;
  },

  async deletePost(postId: string) {
    log.info('deletePost', { postId });
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
  },

  async addCollaborators(postId: string, userIds: string[]) {
    if (userIds.length === 0) return;
    log.info('addCollaborators', { postId, count: userIds.length });
    const { error } = await supabase
      .from('post_collaborators')
      .insert(userIds.map(uid => ({ post_id: postId, user_id: uid })));
    if (error) throw error;
  },

  async reportPost(params: { postId: string; reporterUserId: string; reportedUserId: string; reason: string }) {
    log.info('reportPost', { postId: params.postId, reporterUserId: params.reporterUserId });
    await callEdgeFunction('report-create', {
      body: {
        target_type: 'post',
        target_id: params.postId,
        reason: params.reason,
      },
    });
  },

  async blockUser(params: { blockerUserId: string; blockedUserId: string }) {
    log.info('blockUser', { blockerUserId: params.blockerUserId, blockedUserId: params.blockedUserId });
    await callEdgeFunction('moderation-block', {
      body: { blocked_user_id: params.blockedUserId },
    });
  },

  async getCollaboratorsByPostIds(postIds: string[]) {
    if (postIds.length === 0) return [];
    const { data, error } = await supabase
      .from('post_collaborators')
      .select('post_id, user_id')
      .in('post_id', postIds);
    if (error) throw error;
    return data || [];
  },
};
