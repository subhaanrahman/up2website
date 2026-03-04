
-- Create organiser_members table
CREATE TABLE public.organiser_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_profile_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (organiser_profile_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organiser_members ENABLE ROW LEVEL SECURITY;

-- Helper function to check organiser ownership without recursion
CREATE OR REPLACE FUNCTION public.is_organiser_owner(p_organiser_profile_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organiser_profiles
    WHERE id = p_organiser_profile_id AND owner_id = p_user_id
  );
$$;

-- Helper to check accepted membership
CREATE OR REPLACE FUNCTION public.is_organiser_member(p_organiser_profile_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organiser_members
    WHERE organiser_profile_id = p_organiser_profile_id
      AND user_id = p_user_id
      AND status = 'accepted'
  );
$$;

-- Owner can do everything
CREATE POLICY "Owner full access on organiser_members"
ON public.organiser_members
FOR ALL
TO authenticated
USING (public.is_organiser_owner(organiser_profile_id, auth.uid()))
WITH CHECK (public.is_organiser_owner(organiser_profile_id, auth.uid()));

-- Invited user can see their own membership rows
CREATE POLICY "Invited user can view own memberships"
ON public.organiser_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Invited user can update their own membership (accept/decline)
CREATE POLICY "Invited user can update own membership"
ON public.organiser_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Accepted members can see all members of the same organiser profile
CREATE POLICY "Accepted members can view team"
ON public.organiser_members
FOR SELECT
TO authenticated
USING (public.is_organiser_member(organiser_profile_id, auth.uid()));
