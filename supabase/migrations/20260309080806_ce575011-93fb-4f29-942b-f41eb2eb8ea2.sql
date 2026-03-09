
CREATE OR REPLACE FUNCTION public.get_group_chat_member_profiles(p_group_chat_id uuid)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.display_name, p.username, p.avatar_url
  FROM group_chat_members gcm
  JOIN profiles p ON p.user_id = gcm.user_id
  WHERE gcm.group_chat_id = p_group_chat_id;
$$;
