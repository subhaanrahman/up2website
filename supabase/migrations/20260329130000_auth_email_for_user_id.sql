-- Exact auth.users.email for verify-otp generateLink (avoids guessing digits@phone.local).
CREATE OR REPLACE FUNCTION public.auth_email_for_user_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT u.email::text
  FROM auth.users u
  WHERE u.id = p_user_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_email_for_user_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_for_user_id(uuid) TO service_role;
