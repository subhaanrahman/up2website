-- Resolve auth.users.id by digit-normalized phone (verify-otp when profiles.phone mismatches check-phone).
CREATE OR REPLACE FUNCTION public.auth_user_id_for_phone_digits(p_digits text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE u.phone IS NOT NULL
    AND regexp_replace(u.phone, '\D', '', 'g') = regexp_replace(coalesce(p_digits, ''), '\D', '', 'g')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_user_id_for_phone_digits(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_id_for_phone_digits(text) TO service_role;
