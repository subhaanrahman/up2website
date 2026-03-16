-- rsvp_transfer: transfer current user's RSVP to a friend (SECURITY DEFINER)
-- Used by the Tickets dashboard "Transfer ticket" flow.
CREATE OR REPLACE FUNCTION public.rsvp_transfer(p_event_id uuid, p_to_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_from_user_id uuid := auth.uid();
  v_status text;
  v_guest_count integer;
  v_result jsonb;
BEGIN
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_to_user_id IS NULL OR p_to_user_id = v_from_user_id THEN
    RAISE EXCEPTION 'Invalid transfer recipient';
  END IF;

  -- Require that the recipient is a friend (accepted connection)
  IF NOT EXISTS (
    SELECT 1 FROM connections c
    WHERE c.status = 'accepted'
      AND (
        (c.requester_id = v_from_user_id AND c.addressee_id = p_to_user_id)
        OR (c.requester_id = p_to_user_id AND c.addressee_id = v_from_user_id)
      )
  ) THEN
    RAISE EXCEPTION 'You can only transfer to a friend';
  END IF;

  -- Load current user's RSVP
  SELECT status, guest_count INTO v_status, v_guest_count
  FROM rsvps
  WHERE event_id = p_event_id AND user_id = v_from_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You do not have an RSVP for this event';
  END IF;

  -- Remove current user's RSVP
  DELETE FROM rsvps
  WHERE event_id = p_event_id AND user_id = v_from_user_id;

  -- Create RSVP for the recipient (same status and guest_count)
  INSERT INTO rsvps (event_id, user_id, status, guest_count)
  VALUES (p_event_id, p_to_user_id, v_status, COALESCE(v_guest_count, 1))
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    guest_count = EXCLUDED.guest_count,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'to_user_id', p_to_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_transfer(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rsvp_transfer(uuid, uuid) TO authenticated;
