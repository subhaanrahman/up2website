import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/infrastructure/supabase';
import { useAuth } from "@/contexts/AuthContext";
import { connectionsRepository } from "@/features/social/repositories/connectionsRepository";

export interface PostCollaborator {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface PostEventData {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  cover_image: string | null;
}

export interface PostWithAuthor {
  id: string;
  content: string | null;
  created_at: string;
  author_id: string;
  organiser_profile_id: string | null;
  image_url: string | null;
  gif_url: string | null;
  event_id: string | null;
  author_display_name: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  author_is_verified: boolean;
  reposted_by_name?: string;
  event_data?: PostEventData | null;
  collaborators?: PostCollaborator[];
}

async function fetchPosts(authorId?: string, organiserProfileId?: string): Promise<PostWithAuthor[]> {
  let query = supabase
    .from("posts")
    .select("id, content, created_at, author_id, organiser_profile_id, image_url, gif_url, event_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (authorId) query = query.eq("author_id", authorId);
  if (organiserProfileId) query = query.eq("organiser_profile_id", organiserProfileId);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Fetch author profiles
  const authorIds = [...new Set(data.map((p) => p.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url, is_verified")
    .in("user_id", authorIds);
  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  // Fetch organiser profiles
  const orgIds = [...new Set(data.filter((p) => p.organiser_profile_id).map((p) => p.organiser_profile_id!))];
  let orgMap = new Map<string, { display_name: string; username: string; avatar_url: string | null }>();
  if (orgIds.length > 0) {
    const { data: orgProfiles } = await supabase
      .from("organiser_profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", orgIds);
    orgMap = new Map((orgProfiles || []).map((o) => [o.id, o]));
  }

  // Fetch event data for event-linked posts
  const eventIds = [...new Set(data.filter((p) => p.event_id).map((p) => p.event_id!))];
  let eventMap = new Map<string, PostEventData>();
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, event_date, location, cover_image")
      .in("id", eventIds);
    eventMap = new Map((events || []).map((e) => [e.id, e]));
  }

  // Fetch collaborators for all posts
  const postIds = data.map(p => p.id);
  let collabMap = new Map<string, PostCollaborator[]>();
  if (postIds.length > 0) {
    const { data: collabs } = await supabase
      .from("post_collaborators")
      .select("post_id, user_id")
      .in("post_id", postIds);
    if (collabs && collabs.length > 0) {
      const collabUserIds = [...new Set(collabs.map(c => c.user_id))];
      const { data: collabProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", collabUserIds);
      const collabProfileMap = new Map((collabProfiles || []).map(p => [p.user_id, p]));
      
      for (const c of collabs) {
        const prof = collabProfileMap.get(c.user_id);
        if (!prof) continue;
        const existing = collabMap.get(c.post_id) || [];
        existing.push({ user_id: c.user_id, display_name: prof.display_name || "User", avatar_url: prof.avatar_url });
        collabMap.set(c.post_id, existing);
      }
    }
  }

  return data.map((post) => {
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
        author_is_verified = true; // organiser profiles are always verified
      }
    }
    if (!author_display_name) {
      const prof = profileMap.get(post.author_id);
      author_display_name = prof?.display_name || null;
      author_username = prof?.username || null;
      author_avatar_url = prof?.avatar_url || null;
      author_is_verified = prof?.is_verified ?? false;
    }

    return {
      ...post,
      author_display_name,
      author_username,
      author_avatar_url,
      author_is_verified,
      event_data: post.event_id ? eventMap.get(post.event_id) || null : null,
      collaborators: collabMap.get(post.id) || [],
    };
  });
}

async function fetchFeedWithReposts(currentUserId?: string): Promise<PostWithAuthor[]> {
  let posts = await fetchPosts();
  if (currentUserId) {
    const blockedIds = await connectionsRepository.getBlockedUserIds(currentUserId);
    if (blockedIds.size > 0) {
      posts = posts.filter((p) => !blockedIds.has(p.author_id));
    }
  }
  if (!currentUserId) return posts;

  const { data: reposts } = await supabase
    .from("post_reposts")
    .select("id, post_id, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!reposts || reposts.length === 0) return posts;

  const reposterIds = [...new Set(reposts.map((r) => r.user_id))];
  const { data: reposterProfiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username")
    .in("user_id", reposterIds);
  const reposterMap = new Map((reposterProfiles || []).map((p) => [p.user_id, p]));

  const repostPostIds = [...new Set(reposts.map((r) => r.post_id))];
  const { data: repostedPosts } = await supabase
    .from("posts")
    .select("id, content, created_at, author_id, organiser_profile_id, image_url, gif_url, event_id")
    .in("id", repostPostIds);

  if (!repostedPosts) return posts;

  const repostAuthorIds = [...new Set(repostedPosts.map((p) => p.author_id))];
  const { data: repostAuthorProfiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url, is_verified")
    .in("user_id", repostAuthorIds);
  const repostAuthorMap = new Map((repostAuthorProfiles || []).map((p) => [p.user_id, p]));
  const repostedPostMap = new Map(repostedPosts.map((p) => [p.id, p]));

  const blockedIds = currentUserId ? await connectionsRepository.getBlockedUserIds(currentUserId) : new Set<string>();

  const repostEntries: PostWithAuthor[] = reposts
    .filter((r) => !blockedIds.has(r.user_id))
    .map((repost) => {
      const originalPost = repostedPostMap.get(repost.post_id);
      if (!originalPost) return null;
      if (blockedIds.has(originalPost.author_id)) return null;
      const author = repostAuthorMap.get(originalPost.author_id);
      const reposter = reposterMap.get(repost.user_id);
      return {
        id: originalPost.id,
        content: originalPost.content,
        created_at: repost.created_at,
        author_id: originalPost.author_id,
        organiser_profile_id: originalPost.organiser_profile_id,
        image_url: originalPost.image_url,
        gif_url: originalPost.gif_url,
        event_id: originalPost.event_id,
        author_display_name: author?.display_name || null,
        author_username: author?.username || null,
        author_avatar_url: author?.avatar_url || null,
        author_is_verified: author?.is_verified ?? false,
        reposted_by_name: reposter?.display_name || reposter?.username || "Someone",
        event_data: null,
        collaborators: [],
      } as PostWithAuthor;
    })
    .filter(Boolean) as PostWithAuthor[];

  const merged = [...posts, ...repostEntries];
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}

/**
 * @deprecated Prefer `usePaginatedFeed` from `@/hooks/useFeedQuery`. Legacy non-paginated feed (limit 50 in fetch path).
 * Does not register Realtime — the home feed owns debounced `home-feed-realtime` invalidation to avoid duplicate refetches.
 */
export function useFeedPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feed-posts", "legacy"],
    queryFn: () => fetchFeedWithReposts(user?.id),
  });
}

export function useUserPosts(authorId?: string) {
  return useQuery({
    queryKey: ["user-posts", authorId],
    queryFn: () => fetchPosts(authorId),
    enabled: !!authorId,
  });
}

export function useOrganiserPosts(organiserProfileId?: string) {
  return useQuery({
    queryKey: ["organiser-posts", organiserProfileId],
    queryFn: () => fetchPosts(undefined, organiserProfileId),
    enabled: !!organiserProfileId,
  });
}

async function fetchUserFeedWithReposts(userId: string): Promise<PostWithAuthor[]> {
  // Fetch user's own posts
  const ownPosts = await fetchPosts(userId);

  // Fetch user's reposts
  const { data: reposts } = await supabase
    .from("post_reposts")
    .select("id, post_id, user_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!reposts || reposts.length === 0) return ownPosts;

  // Get the user's display name for "X reposted" label
  const { data: reposterProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("user_id", userId)
    .maybeSingle();
  const reposterName = reposterProfile?.display_name || reposterProfile?.username || "Someone";

  // Fetch the original posts that were reposted
  const repostPostIds = [...new Set(reposts.map((r) => r.post_id))];
  const { data: repostedPosts } = await supabase
    .from("posts")
    .select("id, content, created_at, author_id, organiser_profile_id, image_url, gif_url, event_id")
    .in("id", repostPostIds);

  if (!repostedPosts) return ownPosts;

  // Fetch author profiles for reposted posts
  const repostAuthorIds = [...new Set(repostedPosts.map((p) => p.author_id))];
  const { data: repostAuthorProfiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url, is_verified")
    .in("user_id", repostAuthorIds);
  const repostAuthorMap = new Map((repostAuthorProfiles || []).map((p) => [p.user_id, p]));

  // Fetch organiser profiles for reposted posts
  const orgIds = [...new Set(repostedPosts.filter((p) => p.organiser_profile_id).map((p) => p.organiser_profile_id!))];
  let orgMap = new Map<string, { display_name: string; username: string; avatar_url: string | null }>();
  if (orgIds.length > 0) {
    const { data: orgProfiles } = await supabase
      .from("organiser_profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", orgIds);
    orgMap = new Map((orgProfiles || []).map((o) => [o.id, o]));
  }

  // Fetch event data for reposted posts
  const eventIds = [...new Set(repostedPosts.filter((p) => p.event_id).map((p) => p.event_id!))];
  let eventMap = new Map<string, PostEventData>();
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, event_date, location, cover_image")
      .in("id", eventIds);
    eventMap = new Map((events || []).map((e) => [e.id, e]));
  }

  const repostedPostMap = new Map(repostedPosts.map((p) => [p.id, p]));

  const repostEntries: PostWithAuthor[] = reposts
    .map((repost) => {
      const originalPost = repostedPostMap.get(repost.post_id);
      if (!originalPost) return null;

      let author_display_name: string | null = null;
      let author_username: string | null = null;
      let author_avatar_url: string | null = null;
      let author_is_verified = false;

      if (originalPost.organiser_profile_id) {
        const org = orgMap.get(originalPost.organiser_profile_id);
        if (org) {
          author_display_name = org.display_name;
          author_username = org.username;
          author_avatar_url = org.avatar_url;
          author_is_verified = true;
        }
      }
      if (!author_display_name) {
        const author = repostAuthorMap.get(originalPost.author_id);
        author_display_name = author?.display_name || null;
        author_username = author?.username || null;
        author_avatar_url = author?.avatar_url || null;
        author_is_verified = author?.is_verified ?? false;
      }

      return {
        id: originalPost.id,
        content: originalPost.content,
        created_at: repost.created_at,
        author_id: originalPost.author_id,
        organiser_profile_id: originalPost.organiser_profile_id,
        image_url: originalPost.image_url,
        gif_url: originalPost.gif_url,
        event_id: originalPost.event_id,
        author_display_name,
        author_username,
        author_avatar_url,
        author_is_verified,
        reposted_by_name: reposterName,
        event_data: originalPost.event_id ? eventMap.get(originalPost.event_id) || null : null,
        collaborators: [],
      } as PostWithAuthor;
    })
    .filter(Boolean) as PostWithAuthor[];

  // Merge own posts + reposts, sort by date
  const merged = [...ownPosts, ...repostEntries];
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return merged;
}

export function useUserFeedWithReposts(userId?: string) {
  return useQuery({
    queryKey: ["user-feed-reposts", userId],
    queryFn: () => fetchUserFeedWithReposts(userId!),
    enabled: !!userId,
  });
}
