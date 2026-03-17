import { supabase } from '@/infrastructure/supabase';
import { createLogger } from '@/infrastructure/logger';

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
    const { error } = await supabase.from('reports').insert({
      reporter_id: params.reporterUserId,
      reported_user_id: params.reportedUserId,
      target_type: 'post',
      target_id: params.postId,
      reason: params.reason,
    });
    if (error) throw error;
  },

  async blockUser(params: { blockerUserId: string; blockedUserId: string }) {
    log.info('blockUser', { blockerUserId: params.blockerUserId, blockedUserId: params.blockedUserId });
    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: params.blockerUserId,
      blocked_id: params.blockedUserId,
    });
    if (error) throw error;
  },

  async getPostsForFeed(cursor: string | null, limit: number) {
    let query = supabase
      .from('posts')
      .select('id, content, created_at, author_id, organiser_profile_id, image_url, gif_url, event_id')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (cursor) query = query.lt('created_at', cursor);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getRepostsForFeed(cursor: string | null, limit: number) {
    let query = supabase
      .from('post_reposts')
      .select('id, post_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (cursor) query = query.lt('created_at', cursor);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getPostsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, created_at, author_id, organiser_profile_id, image_url, gif_url, event_id')
      .in('id', ids);
    if (error) throw error;
    return data || [];
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
