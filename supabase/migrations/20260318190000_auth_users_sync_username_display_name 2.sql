-- Backfill auth.users.raw_user_meta_data with username and display_name from profiles
-- so they appear in Supabase Authentication dashboard (user metadata)
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'username', COALESCE(p.username, u.raw_user_meta_data->>'username'),
    'display_name', COALESCE(p.display_name, u.raw_user_meta_data->>'display_name')
  )
FROM public.profiles p
WHERE p.user_id = u.id;
