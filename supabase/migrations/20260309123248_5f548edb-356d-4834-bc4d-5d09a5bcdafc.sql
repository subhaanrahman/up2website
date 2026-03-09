
-- DM threads: 1-1 conversation between a personal/professional user and an organiser
CREATE TABLE public.dm_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organiser_profile_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organiser_profile_id)
);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;

-- The user who initiated the DM can see it
CREATE POLICY "User can view own DM threads"
  ON public.dm_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Organiser owner/members can see DMs sent to their organiser profile
CREATE POLICY "Organiser can view DM threads"
  ON public.dm_threads FOR SELECT
  TO authenticated
  USING (
    is_organiser_owner(organiser_profile_id, auth.uid())
    OR is_organiser_member(organiser_profile_id, auth.uid())
  );

-- Authenticated users can create DM threads (to organisers)
CREATE POLICY "Users can create DM threads"
  ON public.dm_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DM messages
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- Participants can view messages (user or organiser owner/member)
CREATE POLICY "Thread participants can view messages"
  ON public.dm_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_threads t
      WHERE t.id = dm_messages.thread_id
        AND (
          t.user_id = auth.uid()
          OR is_organiser_owner(t.organiser_profile_id, auth.uid())
          OR is_organiser_member(t.organiser_profile_id, auth.uid())
        )
    )
  );

-- Participants can send messages
CREATE POLICY "Thread participants can send messages"
  ON public.dm_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.dm_threads t
      WHERE t.id = dm_messages.thread_id
        AND (
          t.user_id = auth.uid()
          OR is_organiser_owner(t.organiser_profile_id, auth.uid())
          OR is_organiser_member(t.organiser_profile_id, auth.uid())
        )
    )
  );

-- Enable realtime for DM messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;

-- Grant DML privileges
GRANT SELECT, INSERT ON public.dm_threads TO authenticated;
GRANT SELECT, INSERT ON public.dm_messages TO authenticated;
