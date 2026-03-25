-- organiser_profiles: INSERT revoked from authenticated; Edge service client was still resolving to JWT role
-- authenticated (42501) while storage uploads could succeed. Writes go through SECURITY DEFINER (see 20260330120000).

CREATE OR REPLACE FUNCTION public.create_organiser_profile(
  p_display_name text,
  p_username text,
  p_bio text,
  p_city text,
  p_instagram_handle text,
  p_category text,
  p_avatar_url text
)
RETURNS TABLE (id uuid, display_name text, username text, category text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.organiser_profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_category IS NULL OR p_category NOT IN ('Venue', 'Event') THEN
    RAISE EXCEPTION 'Invalid category' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organiser_profiles (
    owner_id,
    display_name,
    username,
    bio,
    city,
    instagram_handle,
    category,
    avatar_url
  )
  VALUES (
    v_uid,
    trim(p_display_name),
    trim(lower(p_username)),
    NULLIF(trim(COALESCE(p_bio, '')), ''),
    NULLIF(trim(COALESCE(p_city, '')), ''),
    NULLIF(trim(COALESCE(p_instagram_handle, '')), ''),
    p_category,
    p_avatar_url
  )
  RETURNING * INTO r;

  RETURN QUERY SELECT r.id, r.display_name, r.username, r.category, r.avatar_url;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Username already taken' USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION public.create_organiser_profile(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organiser_profile(text, text, text, text, text, text, text) TO authenticated;
