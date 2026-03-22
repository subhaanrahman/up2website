-- Repair guest/anonymous reads after project moves or partial migrations.
-- 1) Ensure table privileges for anon (some projects may differ from defaults).
-- 2) Recreate anon RLS policies for events + profiles (idempotent).
-- 3) RPC for check-phone: detect returning users by auth.users.phone when profiles.phone mismatches.

-- Privileges (SELECT only; RLS still applies)
GRANT SELECT ON TABLE public.events TO anon;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.posts TO anon;
GRANT SELECT ON TABLE public.post_reposts TO anon;
GRANT SELECT ON TABLE public.organiser_profiles TO anon;
GRANT SELECT ON TABLE public.post_collaborators TO anon;
GRANT SELECT ON TABLE public.ticket_tiers TO anon;

-- Events: public rows readable by anon
DROP POLICY IF EXISTS "Anon can view public events" ON public.events;
CREATE POLICY "Anon can view public events"
  ON public.events FOR SELECT
  TO anon
  USING (is_public = true);

-- Profiles: metadata for feed authors (must stay aligned with 20260310105752 intent)
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;
CREATE POLICY "Anon can view profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

-- Used by check-phone Edge (service_role only): match by digit-normalized phone
CREATE OR REPLACE FUNCTION public.phone_registered_in_auth(p_digits text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.phone IS NOT NULL
      AND regexp_replace(u.phone, '\D', '', 'g') = regexp_replace(coalesce(p_digits, ''), '\D', '', 'g')
  );
$$;

REVOKE ALL ON FUNCTION public.phone_registered_in_auth(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_registered_in_auth(text) TO service_role;
