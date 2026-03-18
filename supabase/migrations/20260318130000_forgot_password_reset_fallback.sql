-- Fallback for forgot-password-reset when auth.admin.updateUserById fails
-- (e.g. "Database error loading user" for seeded users from auth_users_seed.sql)
-- Only callable with valid reset token; edge function validates before invoking.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- Allow service role to call (edge functions use service role)
GRANT EXECUTE ON FUNCTION public.update_auth_user_password(uuid, text) TO service_role;

-- Tell PostgREST to reload schema cache so it sees the new function
NOTIFY pgrst, 'reload schema';
