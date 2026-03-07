import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PostWithAuthor {
  id: string;
  content: string | null;
  created_at: string;
  author_id: string;
  organiser_profile_id: string | null;
  image_url: string | null;
  gif_url: string | null;
  author_display_name: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  reposted_by_name?: string;
}

async function fetchPosts(authorId?: string, organiserProfileId?: string): Promise<PostWithAuthor[]> {
  let query = supabase
    .from("posts")
    .select("id, content, created_at, author_id, organiser_profile_id, image_url, gif_url")
    .order("created_at", { ascending: false })
    .limit(50);

  if (authorId) query = query.eq("author_id", authorId);
  if (organiserProfileId) query = query.eq("organiser_profile_id", organiserProfileId);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const authorIds = [...new Set(data.map((p) => p.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url")
    .in("user_id", authorIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, p])
  );

  // Fetch organiser profiles for posts that have organiser_profile_id
  const orgIds = [...new Set(data.filter((p) => p.organiser_profile_id).map((p) => p.organiser_profile_id!))];
  let orgMap = new Map<string, { display_name: string; username: string; avatar_url: string | null }>();
  if (orgIds.length > 0) {
    const { data: orgProfiles } = await supabase
      .from("organiser_profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", orgIds);
    orgMap = new Map(
      (orgProfiles || []).map((o) => [o.id, o])
    );
  }

  return data.map((post) => {
    // If post has organiser_profile_id, use organiser identity
    if (post.organiser_profile_id) {
      const org = orgMap.get(post.organiser_profile_id);
      if (org) {
        return {
          ...post,
          author_display_name: org.display_name,
          author_username: org.username,
          author_avatar_url: org.avatar_url,
        };
      }
    }
    const prof = profileMap.get(post.author_id);
    return {
      ...post,
      author_display_name: prof?.display_name || null,
      author_username: prof?.username || null,
      author_avatar_url: prof?.avatar_url || null,
    };
  });
}

async function fetchFeedWithReposts(currentUserId?: string): Promise<PostWithAuthor[]> {
  // Fetch original posts
  const posts = await fetchPosts();

  if (!currentUserId) return posts;

  // Fetch reposts by all users, joined with the original post
  const { data: reposts } = await supabase
    .from("post_reposts")
    .select("id, post_id, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!reposts || reposts.length === 0) return posts;

  // Get reposter profiles
  const reposterIds = [...new Set(reposts.map((r) => r.user_id))];
  const { data: reposterProfiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username")
    .in("user_id", reposterIds);

  const reposterMap = new Map(
    (reposterProfiles || []).map((p) => [p.user_id, p])
  );

  // Get original posts for reposts
  const repostPostIds = [...new Set(reposts.map((r) => r.post_id))];
  const { data: repostedPosts } = await supabase
    .from("posts")
    .select("id, content, created_at, author_id, organiser_profile_id, image_url, gif_url")
    .in("id", repostPostIds);

  if (!repostedPosts) return posts;

  // Get author profiles for reposted posts
  const repostAuthorIds = [...new Set(repostedPosts.map((p) => p.author_id))];
  const { data: repostAuthorProfiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url")
    .in("user_id", repostAuthorIds);

  const repostAuthorMap = new Map(
    (repostAuthorProfiles || []).map((p) => [p.user_id, p])
  );

  const repostedPostMap = new Map(
    repostedPosts.map((p) => [p.id, p])
  );

  // Build repost feed entries
  const repostEntries: PostWithAuthor[] = reposts
    .map((repost) => {
      const originalPost = repostedPostMap.get(repost.post_id);
      if (!originalPost) return null;
      const author = repostAuthorMap.get(originalPost.author_id);
      const reposter = reposterMap.get(repost.user_id);
      return {
        id: originalPost.id,
        content: originalPost.content,
        created_at: repost.created_at, // Use repost time for sorting
        author_id: originalPost.author_id,
        organiser_profile_id: originalPost.organiser_profile_id,
        image_url: originalPost.image_url,
        gif_url: originalPost.gif_url,
        author_display_name: author?.display_name || null,
        author_username: author?.username || null,
        author_avatar_url: author?.avatar_url || null,
        reposted_by_name: reposter?.display_name || reposter?.username || "Someone",
      } as PostWithAuthor;
    })
    .filter(Boolean) as PostWithAuthor[];

  // Merge and sort by created_at descending
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_reposts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
