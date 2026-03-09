CREATE OR REPLACE FUNCTION public.is_profile_public(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;