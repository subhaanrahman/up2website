import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    .select("user_id, display_name, username, avatar_url")
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

    if (post.organiser_profile_id) {
      const org = orgMap.get(post.organiser_profile_id);
      if (org) {
        author_display_name = org.display_name;
        author_username = org.username;
        author_avatar_url = org.avatar_url;
      }
    }
    if (!author_display_name) {
      const prof = profileMap.get(post.author_id);
      author_display_name = prof?.display_name || null;
      author_username = prof?.username || null;
      author_avatar_url = prof?.avatar_url || null;
    }

    return {
      ...post,
      author_display_name,
      author_username,
      author_avatar_url,
      event_data: post.event_id ? eventMap.get(post.event_id) || null : null,
      collaborators: collabMap.get(post.id) || [],
    };
  });
}

async function fetchFeedWithReposts(currentUserId?: string): Promise<PostWithAuthor[]> {
  const posts = await fetchPosts();
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
    .select("user_id, display_name, username, avatar_url")
    .in("user_id", repostAuthorIds);
  const repostAuthorMap = new Map((repostAuthorProfiles || []).map((p) => [p.user_id, p]));
  const repostedPostMap = new Map(repostedPosts.map((p) => [p.id, p]));

  const repostEntries: PostWithAuthor[] = reposts
    .map((repost) => {
      const originalPost = repostedPostMap.get(repost.post_id);
      if (!originalPost) return null;
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

export function useFeedPosts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["feed-posts"],
    queryFn: () => fetchFeedWithReposts(user?.id),
  });

  useEffect(() => {
    const channel = supabase
      .channel("feed-posts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_reposts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
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
    .select("user_id, display_name, username, avatar_url")
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

      if (originalPost.organiser_profile_id) {
        const org = orgMap.get(originalPost.organiser_profile_id);
        if (org) {
          author_display_name = org.display_name;
          author_username = org.username;
          author_avatar_url = org.avatar_url;
        }
      }
      if (!author_display_name) {
        const author = repostAuthorMap.get(originalPost.author_id);
        author_display_name = author?.display_name || null;
        author_username = author?.username || null;
        author_avatar_url = author?.avatar_url || null;
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
