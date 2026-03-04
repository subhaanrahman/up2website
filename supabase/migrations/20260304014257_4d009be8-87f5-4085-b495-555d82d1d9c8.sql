
-- Connections table for mutual friend relationships
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' or 'accepted'
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Users can see connections they're part of
CREATE POLICY "Users can view own connections"
ON public.connections FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests
CREATE POLICY "Users can create connection requests"
ON public.connections FOR INSERT
WITH CHECK (auth.uid() = requester_id);

-- Users can update connections they received (accept)
CREATE POLICY "Addressee can accept connections"
ON public.connections FOR UPDATE
USING (auth.uid() = addressee_id);

-- Users can delete connections they're part of (unfriend)
CREATE POLICY "Users can delete own connections"
ON public.connections FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Function to count mutual friends for a user
CREATE OR REPLACE FUNCTION public.get_friend_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM connections
  WHERE status = 'accepted'
    AND (requester_id = p_user_id OR addressee_id = p_user_id);
$$;

-- Function to count unique attendees across all organiser events
CREATE OR REPLACE FUNCTION public.get_organiser_attendee_count(p_organiser_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT r.user_id)::integer
  FROM rsvps r
  JOIN events e ON e.id = r.event_id
  WHERE e.organiser_profile_id = p_organiser_profile_id
    AND r.status = 'going';
$$;
