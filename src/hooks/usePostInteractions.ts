import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PostCounts {
  likeCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
}

async function fetchPostInteractions(postId: string, userId?: string): Promise<PostCounts> {
  const [likesRes, repostsRes, myLikeRes, myRepostRes] = await Promise.all([
    supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId),
    supabase.from("post_reposts").select("id", { count: "exact", head: true }).eq("post_id", postId),
    userId
      ? supabase.from("post_likes").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    userId
      ? supabase.from("post_reposts").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    likeCount: likesRes.count ?? 0,
    repostCount: repostsRes.count ?? 0,
    isLiked: !!myLikeRes.data,
    isReposted: !!myRepostRes.data,
  };
}

export function usePostInteractions(postId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["post-interactions", postId];

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchPostInteractions(postId, user?.id),
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error("Sign in to like posts"); throw new Error("Not authenticated"); }
      const current = queryClient.getQueryData<PostCounts>(key);
      if (current?.isLiked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<PostCounts>(key);
      if (prev) {
        queryClient.setQueryData<PostCounts>(key, {
          ...prev,
          isLiked: !prev.isLiked,
          likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const toggleRepost = useMutation({
    mutationFn: async () => {
      if (!user) { toast.error("Sign in to repost"); throw new Error("Not authenticated"); }
      const current = queryClient.getQueryData<PostCounts>(key);
      if (current?.isReposted) {
        const { error } = await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_reposts").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<PostCounts>(key);
      if (prev) {
        queryClient.setQueryData<PostCounts>(key, {
          ...prev,
          isReposted: !prev.isReposted,
          repostCount: prev.isReposted ? prev.repostCount - 1 : prev.repostCount + 1,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  return {
    ...query.data,
    isLoading: query.isLoading,
    toggleLike: () => toggleLike.mutate(),
    toggleRepost: () => toggleRepost.mutate(),
  };
}
