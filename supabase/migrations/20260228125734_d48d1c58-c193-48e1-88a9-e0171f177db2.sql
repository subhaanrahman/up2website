
-- 1. Create a SECURITY DEFINER function to check if a user's profile is public
CREATE OR REPLACE FUNCTION public.is_profile_public(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT go_public FROM public.privacy_settings WHERE user_id = p_user_id),
    true  -- Default to public if no privacy settings exist yet
  );
$$;

-- 2. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 3. Create a privacy-aware SELECT policy
CREATE POLICY "Profiles viewable by owner or if public"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    auth.uid() IS NOT NULL
    AND public.is_profile_public(user_id)
  )
);
