-- Host-initiated RSVPs: same business rules as rsvp_join per invitee, without requiring
-- the invitee to pass private-event access checks. Authorised actors: host, organiser
-- owner/member (accepted), or event cohost (user or organiser owner).

CREATE OR REPLACE FUNCTION public.rsvp_host_invite(
  p_event_id uuid,
  p_invitee_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_ids uuid[];
  v_event public.events%ROWTYPE;
  v_invitee uuid;
  v_results jsonb := '[]'::jsonb;
  v_authorized boolean := false;
  v_max_guests integer;
  v_guestlist_enabled boolean;
  v_guestlist_deadline timestamptz;
  v_guestlist_require_approval boolean;
  v_safe_guest_count integer;
  v_effective_status text;
  v_current_count integer;
  v_waitlist_position integer;
  v_existing_status text;
  v_existing_guest_count integer;
  v_row jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_invitee_user_ids IS NULL OR cardinality(p_invitee_user_ids) = 0 THEN
    RETURN jsonb_build_object('results', '[]'::jsonb);
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_ids
  FROM (
    SELECT id FROM (SELECT DISTINCT unnest(p_invitee_user_ids) AS id) d LIMIT 25
  ) t;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  v_authorized := (v_event.host_id = v_actor);

  IF NOT v_authorized AND v_event.organiser_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.organiser_profiles op
      WHERE op.id = v_event.organiser_profile_id AND op.owner_id = v_actor
    ) OR EXISTS (
      SELECT 1 FROM public.organiser_members om
      WHERE om.organiser_profile_id = v_event.organiser_profile_id
        AND om.user_id = v_actor
        AND om.status = 'accepted'
    ) THEN
      v_authorized := true;
    END IF;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM public.event_cohosts ec
      WHERE ec.event_id = p_event_id AND ec.user_id = v_actor
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM public.event_cohosts ec
      INNER JOIN public.organiser_profiles op ON op.id = ec.organiser_profile_id
      WHERE ec.event_id = p_event_id AND op.owner_id = v_actor
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT
    v_event.max_guests,
    COALESCE(v_event.guestlist_enabled, true),
    v_event.guestlist_deadline,
    COALESCE(v_event.guestlist_require_approval, false)
  INTO v_max_guests, v_guestlist_enabled, v_guestlist_deadline, v_guestlist_require_approval;

  FOREACH v_invitee IN ARRAY v_ids
  LOOP
    BEGIN
      v_safe_guest_count := 1;
      v_effective_status := 'going';

      IF NOT v_guestlist_enabled THEN
        v_results := v_results || jsonb_build_array(
          jsonb_build_object(
            'user_id', v_invitee,
            'code', 'error',
            'message', 'Guestlist is disabled for this event'
          )
        );
        CONTINUE;
      END IF;

      IF v_guestlist_deadline IS NOT NULL THEN
        IF now() > v_guestlist_deadline THEN
          v_results := v_results || jsonb_build_array(
            jsonb_build_object(
              'user_id', v_invitee,
              'code', 'error',
              'message', 'Guestlist is closed'
            )
          );
          CONTINUE;
        END IF;
      END IF;

      IF v_guestlist_require_approval THEN
        v_effective_status := 'pending';
      END IF;

      SELECT r.status, r.guest_count
      INTO v_existing_status, v_existing_guest_count
      FROM public.rsvps r
      WHERE r.event_id = p_event_id AND r.user_id = v_invitee;

      IF v_existing_status IS NOT NULL
         AND v_existing_status = v_effective_status
         AND COALESCE(v_existing_guest_count, 1) = v_safe_guest_count THEN
        v_results := v_results || jsonb_build_array(
          jsonb_build_object(
            'user_id', v_invitee,
            'code', 'already_rsvp',
            'status', v_existing_status
          )
        );
        CONTINUE;
      END IF;

      IF v_max_guests IS NOT NULL AND v_effective_status = 'going' THEN
        SELECT COALESCE(SUM(guest_count), 0) INTO v_current_count
        FROM public.rsvps
        WHERE event_id = p_event_id AND status = 'going';

        IF (v_current_count + v_safe_guest_count) > v_max_guests
           AND NOT EXISTS (
             SELECT 1 FROM public.rsvps WHERE event_id = p_event_id AND user_id = v_invitee
           ) THEN
          SELECT w.position
          INTO v_waitlist_position
          FROM public.waitlist w
          WHERE w.event_id = p_event_id AND w.user_id = v_invitee;

          IF v_waitlist_position IS NULL THEN
            INSERT INTO public.waitlist (event_id, user_id, position)
            VALUES (
              p_event_id,
              v_invitee,
              COALESCE((SELECT MAX(position) FROM public.waitlist WHERE event_id = p_event_id), 0) + 1
            )
            RETURNING position INTO v_waitlist_position;
          END IF;

          v_results := v_results || jsonb_build_array(
            jsonb_build_object(
              'user_id', v_invitee,
              'code', 'waitlisted',
              'position', v_waitlist_position
            )
          );
          CONTINUE;
        END IF;
      END IF;

      INSERT INTO public.rsvps (event_id, user_id, status, guest_count)
      VALUES (p_event_id, v_invitee, v_effective_status, v_safe_guest_count)
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        guest_count = EXCLUDED.guest_count,
        updated_at = now()
      RETURNING jsonb_build_object(
        'id', id, 'event_id', event_id, 'user_id', user_id,
        'status', status, 'guest_count', guest_count, 'created_at', created_at
      ) INTO v_row;

      IF EXISTS (
        SELECT 1 FROM public.waitlist w
        WHERE w.event_id = p_event_id AND w.user_id = v_invitee
      ) THEN
        DELETE FROM public.waitlist
        WHERE event_id = p_event_id AND user_id = v_invitee;

        WITH ordered AS (
          SELECT wl.id, ROW_NUMBER() OVER (ORDER BY wl.created_at, wl.id) AS rn
          FROM public.waitlist wl
          WHERE wl.event_id = p_event_id
        )
        UPDATE public.waitlist w
        SET position = ordered.rn
        FROM ordered
        WHERE w.id = ordered.id;
      END IF;

      v_results := v_results || jsonb_build_array(
        jsonb_build_object(
          'user_id', v_invitee,
          'code', 'ok',
          'detail', v_row
        )
      );

    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_array(
        jsonb_build_object(
          'user_id', v_invitee,
          'code', 'error',
          'message', SQLERRM
        )
      );
    END;
  END LOOP;

  RETURN jsonb_build_object('results', v_results);
END;
$function$;

REVOKE ALL ON FUNCTION public.rsvp_host_invite(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_host_invite(uuid, uuid[]) TO authenticated;
