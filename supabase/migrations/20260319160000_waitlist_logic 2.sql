-- Update rsvp_join to enqueue waitlist at capacity and clear waitlist on RSVP
CREATE OR REPLACE FUNCTION public.rsvp_join(
  p_event_id uuid,
  p_status text DEFAULT 'going',
  p_guest_count integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_max_guests integer;
  v_current_count integer;
  v_is_public boolean;
  v_result jsonb;
  v_safe_guest_count integer;
  v_guestlist_deadline timestamptz;
  v_guestlist_require_approval boolean;
  v_guestlist_enabled boolean;
  v_effective_status text;
  v_waitlist_position integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clamp guest_count between 1 and 5
  v_safe_guest_count := GREATEST(1, LEAST(p_guest_count, 5));

  SELECT max_guests,
         COALESCE(is_public, true),
         COALESCE(guestlist_enabled, true),
         guestlist_deadline,
         COALESCE(guestlist_require_approval, false)
    INTO v_max_guests, v_is_public, v_guestlist_enabled, v_guestlist_deadline, v_guestlist_require_approval
    FROM events
   WHERE id = p_event_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

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

  IF NOT v_guestlist_enabled THEN
    RAISE EXCEPTION 'Guestlist is disabled for this event';
  END IF;

  -- Enforce guestlist deadline for RSVP actions (not for "interested")
  IF v_guestlist_deadline IS NOT NULL AND p_status <> 'interested' THEN
    IF now() > v_guestlist_deadline THEN
      RAISE EXCEPTION 'Guestlist is closed';
    END IF;
  END IF;

  -- Determine final status based on approval requirement
  v_effective_status := p_status;
  IF v_guestlist_require_approval AND p_status IN ('going', 'maybe') THEN
    v_effective_status := 'pending';
  END IF;

  -- Capacity check only for immediate "going" RSVPs
  IF v_max_guests IS NOT NULL AND v_effective_status = 'going' THEN
    SELECT COALESCE(SUM(guest_count), 0) INTO v_current_count
      FROM rsvps
     WHERE event_id = p_event_id AND status = 'going';

    IF (v_current_count + v_safe_guest_count) > v_max_guests
       AND NOT EXISTS (
         SELECT 1 FROM rsvps WHERE event_id = p_event_id AND user_id = v_user_id
       )
    THEN
      -- Enqueue into waitlist instead of throwing
      SELECT position
        INTO v_waitlist_position
        FROM waitlist
       WHERE event_id = p_event_id AND user_id = v_user_id;

      IF v_waitlist_position IS NULL THEN
        INSERT INTO waitlist (event_id, user_id, position)
        VALUES (
          p_event_id,
          v_user_id,
          COALESCE((SELECT MAX(position) FROM waitlist WHERE event_id = p_event_id), 0) + 1
        )
        RETURNING position INTO v_waitlist_position;
      END IF;

      RETURN jsonb_build_object('status', 'waitlisted', 'position', v_waitlist_position);
    END IF;
  END IF;

  INSERT INTO rsvps (event_id, user_id, status, guest_count)
  VALUES (p_event_id, v_user_id, v_effective_status, v_safe_guest_count)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = EXCLUDED.status, guest_count = EXCLUDED.guest_count, updated_at = now()
  RETURNING jsonb_build_object(
    'id', id, 'event_id', event_id, 'user_id', user_id,
    'status', status, 'guest_count', guest_count, 'created_at', created_at
  ) INTO v_result;

  -- If this user was on the waitlist, remove and recompute positions
  IF EXISTS (SELECT 1 FROM waitlist WHERE event_id = p_event_id AND user_id = v_user_id) THEN
    DELETE FROM waitlist
     WHERE event_id = p_event_id AND user_id = v_user_id;

    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
        FROM waitlist
       WHERE event_id = p_event_id
    )
    UPDATE waitlist w
       SET position = ordered.rn
      FROM ordered
     WHERE w.id = ordered.id;
  END IF;

  RETURN v_result;
END;
$function$;
