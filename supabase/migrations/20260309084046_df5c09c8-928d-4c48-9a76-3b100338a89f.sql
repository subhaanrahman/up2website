
-- Grant DML privileges to authenticated role on group_chat_members
GRANT SELECT, INSERT, DELETE ON public.group_chat_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_chats TO authenticated;
GRANT SELECT, INSERT ON public.group_chat_messages TO authenticated;
