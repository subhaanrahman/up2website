ALTER TABLE public.event_cohosts 
  ALTER COLUMN organiser_profile_id DROP NOT NULL,
  ADD COLUMN user_id uuid DEFAULT NULL;

-- Allow cohosts to be viewed by anyone viewing the event
CREATE POLICY "Anyone can view event cohosts"
  ON public.event_cohosts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow event host to insert cohosts
CREATE POLICY "Event host can insert cohosts"
  ON public.event_cohosts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_cohosts.event_id AND events.host_id = auth.uid()
    )
  );

-- Allow event host to delete cohosts
CREATE POLICY "Event host can delete cohosts"
  ON public.event_cohosts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = event_cohosts.event_id AND events.host_id = auth.uid()
    )
  );

-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Cohosts viewable by event host and cohost owner" ON public.event_cohosts;