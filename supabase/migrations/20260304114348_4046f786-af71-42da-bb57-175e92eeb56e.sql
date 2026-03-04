
-- New table: organiser_followers
CREATE TABLE public.organiser_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_profile_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organiser_profile_id, user_id)
);

ALTER TABLE public.organiser_followers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all follower rows (for counts)
CREATE POLICY "Authenticated can view followers"
  ON public.organiser_followers FOR SELECT TO authenticated
  USING (true);

-- Users can follow (insert their own row)
CREATE POLICY "Users can follow organisers"
  ON public.organiser_followers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unfollow (delete their own row)
CREATE POLICY "Users can unfollow organisers"
  ON public.organiser_followers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Function 1: get_organiser_follower_count
CREATE OR REPLACE FUNCTION public.get_organiser_follower_count(p_organiser_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM organiser_followers
  WHERE organiser_profile_id = p_organiser_profile_id;
$$;

-- Function 2: get_organiser_past_event_count
CREATE OR REPLACE FUNCTION public.get_organiser_past_event_count(p_organiser_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM events
  WHERE organiser_profile_id = p_organiser_profile_id
    AND event_date < now();
$$;

-- Function 3: get_personal_combined_event_count
CREATE OR REPLACE FUNCTION public.get_personal_combined_event_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT e.id)::integer
  FROM events e
  WHERE e.event_date < now()
    AND (
      e.host_id = p_user_id
      OR e.organiser_profile_id IN (
        SELECT id FROM organiser_profiles WHERE owner_id = p_user_id
        UNION
        SELECT organiser_profile_id FROM organiser_members
        WHERE user_id = p_user_id AND status = 'accepted'
      )
    );
$$;

-- Function 4: get_friends_and_following_count
CREATE OR REPLACE FUNCTION public.get_friends_and_following_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    (SELECT COUNT(*)::integer FROM connections
     WHERE status = 'accepted'
       AND (requester_id = p_user_id OR addressee_id = p_user_id))
    +
    (SELECT COUNT(*)::integer FROM organiser_followers
     WHERE user_id = p_user_id)
  );
$$;
