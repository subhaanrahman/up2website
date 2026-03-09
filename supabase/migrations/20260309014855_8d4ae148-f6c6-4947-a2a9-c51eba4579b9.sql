
-- 1. Add muted column to connections for notification preferences
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false;

-- 2. Add muted column to organiser_followers
ALTER TABLE public.organiser_followers ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false;

-- 3. Function to get mutual friends between two users
CREATE OR REPLACE FUNCTION public.get_mutual_friends(p_user_a uuid, p_user_b uuid)
RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.user_id, p.display_name, p.username, p.avatar_url
  FROM profiles p
  WHERE p.user_id IN (
    SELECT CASE WHEN c.requester_id = p_user_a THEN c.addressee_id ELSE c.requester_id END
    FROM connections c
    WHERE c.status = 'accepted' AND (c.requester_id = p_user_a OR c.addressee_id = p_user_a)
  )
  AND p.user_id IN (
    SELECT CASE WHEN c.requester_id = p_user_b THEN c.addressee_id ELSE c.requester_id END
    FROM connections c
    WHERE c.status = 'accepted' AND (c.requester_id = p_user_b OR c.addressee_id = p_user_b)
  );
$$;

-- 4. Seed vibe badge tags for Members Only organiser
UPDATE public.organiser_profiles 
SET tags = '["Hip Hop", "R&B", "Afrobeats", "Exclusive", "VIP"]'::jsonb
WHERE id = '6348b9db-fd8a-466e-8549-6c4333cdfa56' AND (tags IS NULL OR tags = '[]'::jsonb);
