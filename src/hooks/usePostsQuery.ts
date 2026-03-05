import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  // Fetch author profiles
  const authorIds = [...new Set(data.map((p) => p.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url")
    .in("user_id", authorIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, p])
  );

  return data.map((post) => {
    const prof = profileMap.get(post.author_id);
    return {
      ...post,
      author_display_name: prof?.display_name || null,
      author_username: prof?.username || null,
      author_avatar_url: prof?.avatar_url || null,
    };
  });
}

export function useFeedPosts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["feed-posts"],
    queryFn: () => fetchPosts(),
  });

  // Realtime subscription
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
