
-- Fix post_likes: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated can view likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;

CREATE POLICY "Authenticated can view likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix post_reposts: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated can view reposts" ON public.post_reposts;
DROP POLICY IF EXISTS "Users can repost" ON public.post_reposts;
DROP POLICY IF EXISTS "Users can unrepost" ON public.post_reposts;

CREATE POLICY "Authenticated can view reposts" ON public.post_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can repost" ON public.post_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost" ON public.post_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);
