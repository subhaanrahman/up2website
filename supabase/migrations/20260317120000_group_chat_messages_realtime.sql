-- Enable realtime for group chat messages so inserts appear for all participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;
