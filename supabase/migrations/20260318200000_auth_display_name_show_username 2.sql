-- Set auth.users display_name (Auth dashboard column) to @username instead of display name
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'display_name', CASE WHEN p.username IS NOT NULL THEN '@' || p.username ELSE u.raw_user_meta_data->>'display_name' END,
    'username', COALESCE(p.username, u.raw_user_meta_data->>'username')
  )
FROM public.profiles p
WHERE p.user_id = u.id;
