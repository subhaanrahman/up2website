
-- 1. Add profile_tier column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_tier text NOT NULL DEFAULT 'personal';

-- 2. Update is_profile_public to use profile_tier instead of privacy_settings.go_public
-- Personal = always private, Professional = always public
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
