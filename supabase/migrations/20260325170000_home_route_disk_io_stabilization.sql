-- Home-route Disk IO stabilization:
-- - add missing indexes for unread/chat/home feed hot paths
-- - add server-side unread-message aggregates so nav badges stop doing client-side N+1 count loops

CREATE INDEX IF NOT EXISTS idx_dm_messages_thread_created_desc
  ON public.dm_messages (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_chat_messages_chat_created_desc
  ON public.group_chat_messages (group_chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_threads_user_updated_desc
  ON public.dm_threads (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_threads_organiser_updated_desc
  ON public.dm_threads (organiser_profile_id, updated_at DESC)
  WHERE organiser_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_group_chat_members_user_chat
  ON public.group_chat_members (user_id, group_chat_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_org_unread_created
  ON public.notifications (user_id, organiser_profile_id, created_at DESC)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_organiser_followers_user_muted
  ON public.organiser_followers (user_id, muted, organiser_profile_id);

CREATE INDEX IF NOT EXISTS idx_organiser_profiles_owner_created
  ON public.organiser_profiles (owner_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_organiser_members_user_status_org
  ON public.organiser_members (user_id, status, organiser_profile_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_blocked
  ON public.blocked_users (blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_blocker
  ON public.blocked_users (blocked_id, blocker_id);

CREATE OR REPLACE FUNCTION public.get_unread_message_counts(p_last_read jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (
  chat_id uuid,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH last_reads AS (
    SELECT
      key::uuid AS chat_id,
      value::timestamptz AS last_read_at
    FROM jsonb_each_text(COALESCE(p_last_read, '{}'::jsonb))
  ),
  group_counts AS (
    SELECT
      gcm.group_chat_id AS chat_id,
      COUNT(*)::bigint AS unread_count
    FROM last_reads lr
    JOIN public.group_chat_members gcm
      ON gcm.group_chat_id = lr.chat_id
     AND gcm.user_id = auth.uid()
    JOIN public.group_chat_messages gmsg
      ON gmsg.group_chat_id = gcm.group_chat_id
    WHERE gmsg.sender_id IS DISTINCT FROM auth.uid()
      AND gmsg.created_at > lr.last_read_at
    GROUP BY gcm.group_chat_id
  ),
  owned_organisers AS (
    SELECT id
    FROM public.organiser_profiles
    WHERE owner_id = auth.uid()
  ),
  dm_counts AS (
    SELECT
      dt.id AS chat_id,
      COUNT(*)::bigint AS unread_count
    FROM last_reads lr
    JOIN public.dm_threads dt
      ON dt.id = lr.chat_id
    JOIN public.dm_messages dm
      ON dm.thread_id = dt.id
    WHERE (
      dt.user_id = auth.uid()
      OR dt.organiser_profile_id IN (SELECT id FROM owned_organisers)
    )
      AND dm.sender_id IS DISTINCT FROM auth.uid()
      AND dm.created_at > lr.last_read_at
    GROUP BY dt.id
  )
  SELECT chat_id, unread_count FROM group_counts
  UNION ALL
  SELECT chat_id, unread_count FROM dm_counts;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_message_total(p_last_read jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::bigint
  FROM public.get_unread_message_counts(p_last_read);
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_message_counts(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_total(jsonb) TO authenticated;
