
-- 1. Create organiser_profiles table
CREATE TABLE public.organiser_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  city text,
  instagram_handle text,
  category text NOT NULL DEFAULT 'Promoter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER update_organiser_profiles_updated_at
  BEFORE UPDATE ON public.organiser_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.organiser_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own organiser profiles"
  ON public.organiser_profiles
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can view organiser profiles"
  ON public.organiser_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Revoke direct DML from anon/authenticated (writes go through edge functions)
REVOKE INSERT, UPDATE, DELETE ON public.organiser_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.organiser_profiles FROM authenticated;

-- 2. Create event_cohosts table
CREATE TABLE public.event_cohosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organiser_profile_id uuid NOT NULL REFERENCES public.organiser_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'cohost',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, organiser_profile_id)
);

ALTER TABLE public.event_cohosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cohosts viewable by event host and cohost owner"
  ON public.event_cohosts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = event_cohosts.event_id AND events.host_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.organiser_profiles WHERE organiser_profiles.id = event_cohosts.organiser_profile_id AND organiser_profiles.owner_id = auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON public.event_cohosts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.event_cohosts FROM authenticated;

-- 3. Add organiser_profile_id to events
ALTER TABLE public.events
  ADD COLUMN organiser_profile_id uuid REFERENCES public.organiser_profiles(id) ON DELETE SET NULL;
