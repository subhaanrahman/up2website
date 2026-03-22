-- Custom password verification for login when signInWithPassword fails
-- (e.g. pgcrypto-written hashes that GoTrue may not verify correctly).
-- Returns user email when valid so we can create session via generateLink.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.verify_auth_password(p_user_id uuid, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_valid boolean;
  v_email text;
BEGIN
  SELECT
    (encrypted_password = crypt(p_password, encrypted_password)),
    email
  INTO v_valid, v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object('valid', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_auth_password(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
