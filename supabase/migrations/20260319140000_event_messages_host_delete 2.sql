-- Allow event hosts and cohosts to delete event board messages
CREATE POLICY "Hosts and cohosts can delete event messages" ON public.event_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_messages.event_id AND e.host_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_cohosts ec
      WHERE ec.event_id = event_messages.event_id AND ec.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.event_cohosts ec
      JOIN public.organiser_profiles op ON op.id = ec.organiser_profile_id
      WHERE ec.event_id = event_messages.event_id AND op.owner_id = auth.uid()
    )
  );