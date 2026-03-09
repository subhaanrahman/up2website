
CREATE POLICY "Members can update group chats"
ON public.group_chats
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_chat_members
    WHERE group_chat_members.group_chat_id = group_chats.id
      AND group_chat_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_chat_members
    WHERE group_chat_members.group_chat_id = group_chats.id
      AND group_chat_members.user_id = auth.uid()
  )
);
