
CREATE OR REPLACE FUNCTION public.purge_orphaned_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer := 0;
  v_count integer;
BEGIN
  -- Delete notifications linking to events that no longer exist
  DELETE FROM notifications
  WHERE link ~ '^/events/[0-9a-f\-]+$'
    AND NOT EXISTS (
      SELECT 1 FROM events WHERE id = (regexp_replace(link, '^/events/', ''))::uuid
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;

  -- Delete notifications linking to posts that no longer exist
  DELETE FROM notifications
  WHERE link ~ '^/post/[0-9a-f\-]+$'
    AND NOT EXISTS (
      SELECT 1 FROM posts WHERE id = (regexp_replace(link, '^/post/', ''))::uuid
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;

  -- Delete notifications linking to user profiles that no longer exist
  DELETE FROM notifications
  WHERE link ~ '^/user/[0-9a-f\-]+$'
    AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE user_id = (regexp_replace(link, '^/user/', ''))::uuid
    )
    AND NOT EXISTS (
      SELECT 1 FROM organiser_profiles WHERE id = (regexp_replace(link, '^/user/', ''))::uuid
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted + v_count;

  RETURN v_deleted;
END;
$$;
