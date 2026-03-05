
CREATE TABLE public.group_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view group chats"
ON public.group_chats FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert group chats"
ON public.group_chats FOR INSERT TO authenticated
WITH CHECK (true);

CREATE TABLE public.group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  content text NOT NULL,
  is_from_current_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view group chat messages"
ON public.group_chat_messages FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert group chat messages"
ON public.group_chat_messages FOR INSERT TO authenticated
WITH CHECK (true);
