-- Use bcrypt cost 10 to match GoTrue's expected format (gen_salt('bf') default is 6).
-- Improves compatibility when verifying passwords after forgot-password-reset.

CREATE OR REPLACE FUNCTION public.update_auth_user_password(p_user_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
