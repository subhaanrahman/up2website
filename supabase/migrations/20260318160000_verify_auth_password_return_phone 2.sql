-- Extend verify_auth_password to return phone and email for login retry
-- Phone: exact auth.users format for signInWithPassword(phone)
-- Email: synthetic digits@phone.local for signInWithPassword(email) fallback (GoTrue may lookup by email)

CREATE OR REPLACE FUNCTION public.verify_auth_password(p_user_id uuid, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_valid boolean;
  v_phone text;
  v_email text;
BEGIN
  SELECT
    (encrypted_password = crypt(p_password, encrypted_password)),
    phone,
    email
  INTO v_valid, v_phone, v_email
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF NOT v_valid THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object('valid', true, 'phone', v_phone, 'email', v_email);
END;
$$;

NOTIFY pgrst, 'reload schema';
