
-- Allow group members to remove other members from groups they belong to
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_chat_members;

CREATE POLICY "Members can remove group members"
  ON public.group_chat_members
  FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_id)
    OR is_group_chat_member(group_chat_id, auth.uid())
  );
