/**
 * Feed Service — v1 deterministic personalized feed
 *
 * Source buckets (highest to lowest priority):
 *   1. Friends / followed users posts          (weight 100)
 *   2. Followed organiser profile posts        (weight 80)
 *   3. Reposts by friends                      (weight 60)
 *   4. Organisers that friends follow           (weight 40)
 *   5. Public content fallback                 (weight 10)
 *
 * Within each bucket, posts are sorted newest-first.
 * Final sort: weight DESC, then recency DESC.
 *
 * Designed to be swapped for ML-backed scoring later.
 */

import { supabase } from '@/infrastructure/supabase';
import type { PostWithAuthor, PostEventData, PostCollaborator } from '@/hooks/usePostsQuery';
import { connectionsRepository } from '../repositories/connectionsRepository';
import { profilesRepository } from '../repositories/profilesRepository';
import { postsRepository } from '../repositories/postsRepository';
import { eventsRepository } from '@/features/events/repositories/eventsRepository';

// ─── Weights ───
const WEIGHT_FRIEND_POST = 100;
const WEIGHT_FOLLOWED_ORG_POST = 80;
const WEIGHT_FRIEND_REPOST = 60;
const WEIGHT_FRIEND_FOLLOWED_ORG = 40;
const WEIGHT_PUBLIC = 10;

// ─── Types ───
export interface ScoredPost extends PostWithAuthor {
  _score: number;
  _feedKey: string; // unique key for deduplication (repost vs original)
}

export interface FeedPage {
  posts: ScoredPost[];
  nextCursor: string | null; // ISO timestamp of last post
  hasMore: boolean;
}

export interface FeedContext {
  userId: string | null;
  friendIds: Set<string>;
  followedOrgIds: Set<string>;
  friendFollowedOrgIds: Set<string>;
}

const PAGE_SIZE = 20;

// ─── Context builder (called once, cached by hook) ───
export async function buildFeedContext(userId: string | null): Promise<FeedContext> {
  if (!userId) {
    return { userId: null, friendIds: new Set(), followedOrgIds: new Set(), friendFollowedOrgIds: new Set() };
  }

  // Parallel: friends, followed organisers
  const [connections, followedOrgIdsList, ownedOrgIdsList] = await Promise.all([
    connectionsRepository.getAcceptedConnections(userId),
    connectionsRepository.getFollowedOrganiserIds(userId),
    profilesRepository.getOwnedOrganiserIds(userId),
  ]);

  const friendIds = new Set<string>();
  for (const c of connections) {
    friendIds.add(c.requester_id === userId ? c.addressee_id : c.requester_id);
  }

  const ownedOrgIds = new Set(ownedOrgIdsList);
  let followedOrgIds = new Set(followedOrgIdsList.filter(id => !ownedOrgIds.has(id)));

  // Organisers that friends follow (secondary signal)
  let friendFollowedOrgIds = new Set<string>();
  if (friendIds.size > 0) {
    const friendArr = [...friendIds].slice(0, 50);
    const friendFollows = await connectionsRepository.getFollowersByFriends(friendArr);
    friendFollowedOrgIds = new Set(
      friendFollows.filter(id => !followedOrgIds.has(id) && !ownedOrgIds.has(id)),
    );
  }

  return { userId, friendIds, followedOrgIds, friendFollowedOrgIds };
}

// ─── Score a single post ───
function scorePost(
  post: { author_id: string; organiser_profile_id: string | null; reposted_by_user_id?: string },
  ctx: FeedContext,
): number {
  if (!ctx.userId) return WEIGHT_PUBLIC;

  // Own organiser post on personal feed — don't boost (only show as public if at all)
  if (post.author_id === ctx.userId && post.organiser_profile_id) {
    return WEIGHT_PUBLIC;
  }

  // Repost by friend?
  if (post.reposted_by_user_id && ctx.friendIds.has(post.reposted_by_user_id)) {
    return WEIGHT_FRIEND_REPOST;
  }

  // Direct friend post
  if (ctx.friendIds.has(post.author_id)) {
    return WEIGHT_FRIEND_POST;
  }

  // Followed organiser post
  if (post.organiser_profile_id && ctx.followedOrgIds.has(post.organiser_profile_id)) {
    return WEIGHT_FOLLOWED_ORG_POST;
  }

  // Organiser that friends follow
  if (post.organiser_profile_id && ctx.friendFollowedOrgIds.has(post.organiser_profile_id)) {
    return WEIGHT_FRIEND_FOLLOWED_ORG;
  }

  return WEIGHT_PUBLIC;
}

// ─── Fetch & enrich posts ───
async function enrichPosts(
  rawPosts: any[],
  repostMeta?: Map<string, { reposterId: string; reposterName: string; repostCreatedAt: string }>,
): Promise<PostWithAuthor[]> {
  if (rawPosts.length === 0) return [];

  const authorIds = [...new Set(rawPosts.map(p => p.author_id))];
  const orgIds = [...new Set(rawPosts.filter(p => p.organiser_profile_id).map(p => p.organiser_profile_id!))];
  const eventIds = [...new Set(rawPosts.filter(p => p.event_id).map(p => p.event_id!))];
  const postIds = rawPosts.map(p => p.id);

  // Parallel metadata fetch
  const [profiles, orgs, events, collabData] = await Promise.all([
    profilesRepository.getProfilesByIds(authorIds),
    profilesRepository.getOrganisersByIds(orgIds),
    eventsRepository.getEventSummariesByIds(eventIds),
    postsRepository.getCollaboratorsByPostIds(postIds),
  ]);

  const profileMap = new Map(profiles.map(p => [p.user_id, p]));
  const orgMap = new Map(orgs.map(o => [o.id, o]));
  const eventMap = new Map<string, PostEventData>(events.map((e: any) => [e.id, e]));

  // Collaborators
  const collabMap = new Map<string, PostCollaborator[]>();
  if (collabData.length > 0) {
    const collabUserIds = [...new Set(collabData.map((c: any) => c.user_id))];
    const collabProfiles = await profilesRepository.getProfileDisplayInfo(collabUserIds);
    const cpMap = new Map(collabProfiles.map(p => [p.user_id, p]));
    for (const c of collabData) {
      const prof = cpMap.get((c as any).user_id);
      if (!prof) continue;
      const arr = collabMap.get((c as any).post_id) || [];
      arr.push({ user_id: (c as any).user_id, display_name: prof.display_name || 'User', avatar_url: prof.avatar_url });
      collabMap.set((c as any).post_id, arr);
    }
  }

  return rawPosts.map(post => {
    let author_display_name: string | null = null;
    let author_username: string | null = null;
    let author_avatar_url: string | null = null;
    let author_is_verified = false;

    if (post.organiser_profile_id) {
      const org = orgMap.get(post.organiser_profile_id);
      if (org) {
        author_display_name = org.display_name;
        author_username = org.username;
        author_avatar_url = org.avatar_url;
        author_is_verified = true;
      }
    }
    if (!author_display_name) {
      const prof = profileMap.get(post.author_id);
      author_display_name = prof?.display_name || null;
      author_username = prof?.username || null;
      author_avatar_url = prof?.avatar_url || null;
      author_is_verified = prof?.is_verified ?? false;
    }

    const rm = repostMeta?.get(post.id);

    return {
      id: post.id,
      content: post.content,
      created_at: rm?.repostCreatedAt || post.created_at,
      author_id: post.author_id,
      organiser_profile_id: post.organiser_profile_id,
      image_url: post.image_url,
      gif_url: post.gif_url,
      event_id: post.event_id,
      author_display_name,
      author_username,
      author_avatar_url,
      author_is_verified,
      reposted_by_name: rm?.reposterName,
      event_data: post.event_id ? eventMap.get(post.event_id) || null : null,
      collaborators: collabMap.get(post.id) || [],
    } as PostWithAuthor;
  });
}

// ─── Main feed fetch ───
export async function fetchFeedPage(
  ctx: FeedContext,
  cursor: string | null,
  pageSize = PAGE_SIZE,
): Promise<FeedPage> {
  // 1. Fetch original posts
  let postsQuery = supabase
    .from('posts')
    .select('id, content, created_at, author_id, organiser_profile_id, image_url, gif_url, event_id')
    .order('created_at', { ascending: false })
    .limit(pageSize + 10); // over-fetch slightly for merging with reposts

  if (cursor) {
    postsQuery = postsQuery.lt('created_at', cursor);
  }

  const { data: rawPosts, error: postsError } = await postsQuery;
  if (postsError) throw postsError;

  // 2. Fetch reposts in the same time window
  let repostsQuery = supabase
    .from('post_reposts')
    .select('id, post_id, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (cursor) {
    repostsQuery = repostsQuery.lt('created_at', cursor);
  }

  const { data: rawReposts } = await repostsQuery;

  // 3. Fetch repost source posts that may not be in our main query
  const repostPostIds = [...new Set((rawReposts || []).map(r => r.post_id))];
  const existingPostIds = new Set((rawPosts || []).map(p => p.id));
  const missingRepostIds = repostPostIds.filter(id => !existingPostIds.has(id));

  let repostedSourcePosts: any[] = [];
  if (missingRepostIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select('id, content, created_at, author_id, organiser_profile_id, image_url, gif_url, event_id')
      .in('id', missingRepostIds);
    repostedSourcePosts = data || [];
  }

  // 4. Build repost metadata
  const repostMeta = new Map<string, { reposterId: string; reposterName: string; repostCreatedAt: string }>();
  if (rawReposts && rawReposts.length > 0) {
    const reposterIds = [...new Set(rawReposts.map(r => r.user_id))];
    const reposterProfiles = await profilesRepository.getProfilesByIds(reposterIds);
    const rpMap = new Map(reposterProfiles.map(p => [p.user_id, p]));

    for (const r of rawReposts) {
      const rp = rpMap.get(r.user_id);
      repostMeta.set(r.post_id, {
        reposterId: r.user_id,
        reposterName: rp?.display_name || rp?.username || 'Someone',
        repostCreatedAt: r.created_at,
      });
    }
  }

  // 5. Merge all posts + enrich
  const allRawPosts = [...(rawPosts || []), ...repostedSourcePosts];
  // Deduplicate by id
  const uniqueMap = new Map<string, any>();
  for (const p of allRawPosts) {
    if (!uniqueMap.has(p.id)) uniqueMap.set(p.id, p);
  }

  const enriched = await enrichPosts([...uniqueMap.values()], repostMeta);

  // 6. Score each post
  const scored: ScoredPost[] = enriched.map(post => {
    const rm = repostMeta.get(post.id);
    const score = scorePost(
      {
        author_id: post.author_id,
        organiser_profile_id: post.organiser_profile_id,
        reposted_by_user_id: rm?.reposterId,
      },
      ctx,
    );
    return {
      ...post,
      _score: score,
      _feedKey: rm ? `repost-${post.id}-${rm.reposterId}` : post.id,
    };
  });

  // 7. Sort: score DESC, then recency DESC
  scored.sort((a, b) => {
    if (a._score !== b._score) return b._score - a._score;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // 8. Deduplicate (same post may appear as original + repost)
  const seen = new Set<string>();
  const deduped: ScoredPost[] = [];
  for (const p of scored) {
    if (seen.has(p._feedKey)) continue;
    seen.add(p._feedKey);
    deduped.push(p);
  }

  const page = deduped.slice(0, pageSize);
  const lastPost = page[page.length - 1];
  const hasMore = deduped.length > pageSize;

  return {
    posts: page,
    nextCursor: lastPost ? lastPost.created_at : null,
    hasMore,
  };
}

// ─── Public feed for unauthenticated users ───
export async function fetchPublicFeedPage(
  cursor: string | null,
  pageSize = PAGE_SIZE,
): Promise<FeedPage> {
  return fetchFeedPage(
    { userId: null, friendIds: new Set(), followedOrgIds: new Set(), friendFollowedOrgIds: new Set() },
    cursor,
    pageSize,
  );
}

// ─── Nearby events (DB-backed) ───
export async function fetchNearbyEvents(city: string | null, limit = 4) {
  const now = new Date().toISOString();

  let query = supabase
    .from('events')
    .select('id, title, event_date, location, cover_image, category, ticket_price_cents, host_id, organiser_profile_id')
    .eq('is_public', true)
    .gte('event_date', now)
    .order('event_date', { ascending: true })
    .limit(limit);

  if (city) {
    query = query.ilike('location', `%${city}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // If city filter returned too few, backfill with any upcoming
  if (city && (data || []).length < 2) {
    const { data: backfill } = await supabase
      .from('events')
      .select('id, title, event_date, location, cover_image, category, ticket_price_cents, host_id, organiser_profile_id')
      .eq('is_public', true)
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(limit);
    
    const existing = new Set((data || []).map(e => e.id));
    const merged = [...(data || []), ...(backfill || []).filter(e => !existing.has(e.id))];
    return merged.slice(0, limit);
  }

  return data || [];
}
