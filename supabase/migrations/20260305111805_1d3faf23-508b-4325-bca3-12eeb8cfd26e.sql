
-- Fix: personal profile friend count should only count mutual connections, not organiser follows
CREATE OR REPLACE FUNCTION public.get_friends_and_following_count(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM connections
  WHERE status = 'accepted'
    AND (requester_id = p_user_id OR addressee_id = p_user_id);
$$;
