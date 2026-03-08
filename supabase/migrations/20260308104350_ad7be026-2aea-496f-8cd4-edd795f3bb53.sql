
-- Fix post_likes: drop restrictive, create permissive
DROP POLICY "Authenticated can view likes" ON post_likes;
DROP POLICY "Users can like posts" ON post_likes;
DROP POLICY "Users can unlike posts" ON post_likes;

CREATE POLICY "Authenticated can view likes" ON post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix post_reposts: drop restrictive, create permissive
DROP POLICY "Authenticated can view reposts" ON post_reposts;
DROP POLICY "Users can repost" ON post_reposts;
DROP POLICY "Users can unrepost" ON post_reposts;

CREATE POLICY "Authenticated can view reposts" ON post_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can repost" ON post_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost" ON post_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);
