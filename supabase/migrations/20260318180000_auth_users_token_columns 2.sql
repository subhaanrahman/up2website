-- Fix "Database error querying schema" for users created via raw SQL (e.g. auth_users_seed)
-- GoTrue fails when confirmation_token, recovery_token, email_change_token_new, email_change are NULL
-- See: https://github.com/supabase/auth/issues/1940

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL;
