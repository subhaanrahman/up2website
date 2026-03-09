
-- P-07: Add guest_count to rsvps
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS guest_count integer NOT NULL DEFAULT 1;

-- P-10: Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own waitlist entries" ON public.waitlist
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Event host can view waitlist" ON public.waitlist
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events WHERE events.id = waitlist.event_id AND events.host_id = auth.uid()
  ));

-- Update rsvp_join to accept guest_count parameter
CREATE OR REPLACE FUNCTION public.rsvp_join(p_event_id uuid, p_status text DEFAULT 'going', p_guest_count integer DEFAULT 1)
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clamp guest_count between 1 and 5
  v_safe_guest_count := GREATEST(1, LEAST(p_guest_count, 5));

  SELECT max_guests, COALESCE(is_public, true)
    INTO v_max_guests, v_is_public
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

  IF v_max_guests IS NOT NULL THEN
    SELECT COALESCE(SUM(guest_count), 0) INTO v_current_count
      FROM rsvps
     WHERE event_id = p_event_id AND status = 'going';

    IF (v_current_count + v_safe_guest_count) > v_max_guests
       AND NOT EXISTS (
         SELECT 1 FROM rsvps WHERE event_id = p_event_id AND user_id = v_user_id
       )
    THEN
      RAISE EXCEPTION 'Event is at capacity';
    END IF;
  END IF;

  INSERT INTO rsvps (event_id, user_id, status, guest_count)
  VALUES (p_event_id, v_user_id, p_status, v_safe_guest_count)
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = EXCLUDED.status, guest_count = EXCLUDED.guest_count, updated_at = now()
  RETURNING jsonb_build_object(
    'id', id, 'event_id', event_id, 'user_id', user_id,
    'status', status, 'guest_count', guest_count, 'created_at', created_at
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
