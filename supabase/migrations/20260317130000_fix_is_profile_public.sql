-- Fix is_profile_public: check profile_tier (personal = private, professional = public)
-- Replaces hardcoded SELECT true
CREATE OR REPLACE FUNCTION public.is_profile_public(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT profile_tier = 'professional' FROM public.profiles WHERE user_id = p_user_id),
    false
  );
$$;
