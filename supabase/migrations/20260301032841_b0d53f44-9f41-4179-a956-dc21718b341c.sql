
-- 2) Index for fast capacity count queries
CREATE INDEX IF NOT EXISTS idx_rsvps_event_status ON public.rsvps (event_id, status);

-- 3) Atomic rsvp_join with SECURITY DEFINER + internal validation
CREATE OR REPLACE FUNCTION public.rsvp_join(p_event_id uuid, p_status text DEFAULT 'going')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_max_guests integer;
  v_current_count integer;
  v_is_public boolean;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock event row, fetch capacity + visibility
  SELECT max_guests, COALESCE(is_public, true)
    INTO v_max_guests, v_is_public
    FROM events
   WHERE id = p_event_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Access check: public events open to all; private requires host or invite
  IF NOT v_is_public THEN
    IF NOT EXISTS (
      SELECT 1 FROM events WHERE id = p_event_id AND host_id = v_user_id
    ) AND NOT EXISTS (
      SELECT 1 FROM invites
       WHERE event_id = p_event_id
         AND (invitee_id = v_user_id OR invitee_email = (
           SELECT email FROM auth.users WHERE id = v_user_id
         ))
    ) THEN
      RAISE EXCEPTION 'You do not have access to this event';
    END IF;
  END IF;

  -- Capacity check
  IF v_max_guests IS NOT NULL THEN
    SELECT count(*) INTO v_current_count
      FROM rsvps
     WHERE event_id = p_event_id AND status = 'going';

    IF v_current_count >= v_max_guests
       AND NOT EXISTS (
         SELECT 1 FROM rsvps WHERE event_id = p_event_id AND user_id = v_user_id
       )
    THEN
      RAISE EXCEPTION 'Event is at capacity';
    END IF;
  END IF;

  -- Upsert (unique constraint prevents duplicates)
  INSERT INTO rsvps (event_id, user_id, status)
  VALUES (p_event_id, v_user_id, p_status)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  RETURNING jsonb_build_object(
    'id', id, 'event_id', event_id, 'user_id', user_id,
    'status', status, 'created_at', created_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Atomic rsvp_leave
CREATE OR REPLACE FUNCTION public.rsvp_leave(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM rsvps
   WHERE event_id = p_event_id AND user_id = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
END;
$$;

-- 4) Restrict to authenticated users only
REVOKE ALL ON FUNCTION public.rsvp_join(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rsvp_join(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.rsvp_leave(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rsvp_leave(uuid) TO authenticated;
