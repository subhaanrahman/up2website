-- Revert bcrypt cost to 6 (match auth_users_seed) for GoTrue/pgcrypto compatibility
-- Cost 10 from pgcrypto may produce hashes GoTrue rejects; seed (cost 6) works with signInWithPassword

CREATE OR REPLACE FUNCTION public.update_auth_user_password(p_user_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
BEGIN
  UPDATE auth.users
  SET
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
