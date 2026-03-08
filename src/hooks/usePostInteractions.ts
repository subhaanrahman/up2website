import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ReactionType } from "@/components/ReactionPicker";

const REACTION_EMOJI: Record<string, string> = {
  heart: '❤️', fire: '🔥', eyes: '👀', pray: '🙏', pink_heart: '🩷',
};

async function sendPostNotification(
  type: 'post_reaction' | 'post_repost',
  postId: string,
  senderUserId: string,
  reactionType?: ReactionType,
) {
  try {
    // Get post author info
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();
    if (!post || post.author_id === senderUserId) return; // don't notify self

    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', senderUserId)
      .single();

    const senderName = sender?.display_name || 'Someone';
    const emoji = reactionType ? (REACTION_EMOJI[reactionType] || '❤️') : '';

    const title = type === 'post_reaction'
      ? `${senderName} reacted ${emoji}`
      : `${senderName} reposted your post`;
    const message = type === 'post_reaction'
      ? `${senderName} reacted ${emoji} to your post`
      : `${senderName} reposted your post`;

    await supabase.functions.invoke('notifications-send', {
      body: {
        type,
        recipient_user_id: post.author_id,
        title,
        message,
        avatar_url: sender?.avatar_url || null,
        link: `/post/${postId}`,
      },
    });
  } catch (e) {
    console.error('Failed to send post notification:', e);
  }
}

interface PostCounts {
  likeCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  reactionType: ReactionType | null;
  reactionBreakdown: Record<string, number>;
}

async function fetchPostInteractions(postId: string, userId?: string): Promise<PostCounts> {
  const [likesRes, repostsRes, myLikeRes, myRepostRes] = await Promise.all([
    supabase
      .from("post_likes")
      .select("id, reaction_type")
      .eq("post_id", postId),
    supabase
      .from("post_reposts")
      .select("id", { count: "exact" })
      .eq("post_id", postId),
    userId
      ? supabase
          .from("post_likes")
          .select("id, reaction_type")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    userId
      ? supabase
          .from("post_reposts")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Build reaction breakdown
  const breakdown: Record<string, number> = {};
  (likesRes.data || []).forEach((l: any) => {
    const rt = l.reaction_type || "heart";
    breakdown[rt] = (breakdown[rt] || 0) + 1;
  });

  return {
    likeCount: likesRes.data?.length ?? 0,
    repostCount: repostsRes.count ?? 0,
    isLiked: !!myLikeRes.data,
    isReposted: !!myRepostRes.data,
    reactionType: (myLikeRes.data as any)?.reaction_type || null,
    reactionBreakdown: breakdown,
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

  const react = useMutation({
    mutationFn: async ({
      reactionType,
      wasLiked,
    }: {
      reactionType: ReactionType;
      wasLiked: boolean;
    }) => {
      if (!user) {
        toast.error("Sign in to react to posts");
        throw new Error("Not authenticated");
      }
      if (wasLiked) {
        // Update existing reaction to new type
        const { error } = await supabase
          .from("post_likes")
          .update({ reaction_type: reactionType })
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Insert new reaction
        const { error } = await supabase
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
        if (error) throw error;
      }
    },
    onMutate: async ({ reactionType, wasLiked }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<PostCounts>(key);
      if (prev) {
        queryClient.setQueryData<PostCounts>(key, {
          ...prev,
          isLiked: true,
          likeCount: wasLiked ? prev.likeCount : prev.likeCount + 1,
          reactionType: reactionType,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const unreact = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast.error("Sign in to react to posts");
        throw new Error("Not authenticated");
      }
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<PostCounts>(key);
      if (prev) {
        queryClient.setQueryData<PostCounts>(key, {
          ...prev,
          isLiked: false,
          likeCount: Math.max(0, prev.likeCount - 1),
          reactionType: null,
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
    mutationFn: async (wasReposted: boolean) => {
      if (!user) {
        toast.error("Sign in to repost");
        throw new Error("Not authenticated");
      }
      if (wasReposted) {
        const { error } = await supabase
          .from("post_reposts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_reposts")
          .insert({ post_id: postId, user_id: user.id });
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
          repostCount: prev.isReposted
            ? prev.repostCount - 1
            : prev.repostCount + 1,
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
    handleReact: (type: ReactionType) => {
      const current = queryClient.getQueryData<PostCounts>(key);
      react.mutate({ reactionType: type, wasLiked: !!current?.isLiked });
    },
    handleUnreact: () => {
      unreact.mutate();
    },
    toggleRepost: () => {
      const current = queryClient.getQueryData<PostCounts>(key);
      toggleRepost.mutate(!!current?.isReposted);
    },
  };
}
