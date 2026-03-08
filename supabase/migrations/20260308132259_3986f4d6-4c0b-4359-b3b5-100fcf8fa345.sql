-- Allow users to update their own reactions (change reaction_type)
CREATE POLICY "Users can update own likes"
ON public.post_likes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);