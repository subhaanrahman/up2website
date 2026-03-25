-- organiser_profiles: UPDATE revoked from authenticated; service_role UPDATE can still hit 42501 in some setups.
-- Writes go through SECURITY DEFINER (same pattern as create_organiser_profile).

CREATE OR REPLACE FUNCTION public.update_organiser_profile(p_profile_id uuid, p_patch jsonb)
RETURNS TABLE (id uuid, display_name text, username text, category text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.organiser_profiles%ROWTYPE;
  v_display_name text;
  v_username text;
  v_bio text;
  v_city text;
  v_instagram text;
  v_category text;
  v_hours jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organiser_profiles op
    WHERE op.id = p_profile_id AND op.owner_id = v_uid
  ) THEN
    IF EXISTS (SELECT 1 FROM public.organiser_profiles WHERE id = p_profile_id) THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT op.display_name, op.username, op.bio, op.city, op.instagram_handle, op.category, op.opening_hours
  INTO v_display_name, v_username, v_bio, v_city, v_instagram, v_category, v_hours
  FROM public.organiser_profiles op
  WHERE op.id = p_profile_id AND op.owner_id = v_uid;

  IF p_patch ? 'display_name' THEN
    v_display_name := trim((p_patch->>'display_name')::text);
  END IF;
  IF p_patch ? 'username' THEN
    v_username := trim(lower((p_patch->>'username')::text));
  END IF;
  IF p_patch ? 'bio' THEN
    v_bio := CASE
      WHEN p_patch->'bio' IS NULL OR jsonb_typeof(p_patch->'bio') = 'null' THEN NULL
      ELSE NULLIF(trim((p_patch->>'bio')::text), '')
    END;
  END IF;
  IF p_patch ? 'city' THEN
    v_city := CASE
      WHEN p_patch->'city' IS NULL OR jsonb_typeof(p_patch->'city') = 'null' THEN NULL
      ELSE NULLIF(trim((p_patch->>'city')::text), '')
    END;
  END IF;
  IF p_patch ? 'instagram_handle' THEN
    v_instagram := CASE
      WHEN p_patch->'instagram_handle' IS NULL OR jsonb_typeof(p_patch->'instagram_handle') = 'null' THEN NULL
      ELSE NULLIF(trim((p_patch->>'instagram_handle')::text), '')
    END;
  END IF;
  IF p_patch ? 'category' THEN
    IF (p_patch->>'category') IS NOT NULL AND (p_patch->>'category') NOT IN ('Venue', 'Event') THEN
      RAISE EXCEPTION 'Invalid category' USING ERRCODE = '22023';
    END IF;
    IF (p_patch->>'category') IS NOT NULL THEN
      v_category := (p_patch->>'category')::text;
    END IF;
  END IF;
  IF p_patch ? 'opening_hours' THEN
    v_hours := CASE
      WHEN p_patch->'opening_hours' IS NULL OR jsonb_typeof(p_patch->'opening_hours') = 'null' THEN NULL
      ELSE p_patch->'opening_hours'
    END;
  END IF;

  UPDATE public.organiser_profiles op
  SET
    display_name = v_display_name,
    username = v_username,
    bio = v_bio,
    city = v_city,
    instagram_handle = v_instagram,
    category = v_category,
    opening_hours = v_hours,
    updated_at = now()
  WHERE op.id = p_profile_id AND op.owner_id = v_uid
  RETURNING * INTO r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Update failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY SELECT r.id, r.display_name, r.username, r.category;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Username already taken' USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION public.update_organiser_profile(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_organiser_profile(uuid, jsonb) TO authenticated;
