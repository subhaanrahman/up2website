
-- Create check_ins table
CREATE TABLE public.check_ins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid NOT NULL,
  method text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Host/organiser can manage check-ins
CREATE POLICY "Host can manage check-ins"
  ON public.check_ins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = check_ins.event_id AND events.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_profiles op ON op.id = e.organiser_profile_id
      WHERE e.id = check_ins.event_id AND op.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_members om ON om.organiser_profile_id = e.organiser_profile_id
      WHERE e.id = check_ins.event_id AND om.user_id = auth.uid() AND om.status = 'accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = check_ins.event_id AND events.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_profiles op ON op.id = e.organiser_profile_id
      WHERE e.id = check_ins.event_id AND op.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organiser_members om ON om.organiser_profile_id = e.organiser_profile_id
      WHERE e.id = check_ins.event_id AND om.user_id = auth.uid() AND om.status = 'accepted'
    )
  );

-- Public can view check-ins for public events (useful for attendee count displays)
CREATE POLICY "Public can view check-ins for public events"
  ON public.check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events WHERE events.id = check_ins.event_id AND events.is_public = true
    )
  );
