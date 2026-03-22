-- Allow organiser owners and accepted members to SELECT/UPDATE/DELETE org events via RLS
-- (mirrors Edge events-update authorization). Host policies remain unchanged.
-- Version 20260331120200: unique migration id (avoid duplicate 20260331120000 with profiles migration).

CREATE POLICY "Organiser owners can view org events" ON public.events
  FOR SELECT USING (
    organiser_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organiser_profiles op
      WHERE op.id = events.organiser_profile_id AND op.owner_id = auth.uid()
    )
  );

CREATE POLICY "Organiser members can view org events" ON public.events
  FOR SELECT USING (
    organiser_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organiser_members om
      WHERE om.organiser_profile_id = events.organiser_profile_id
        AND om.user_id = auth.uid()
        AND om.status = 'accepted'
    )
  );

CREATE POLICY "Organiser owners can update org events" ON public.events
  FOR UPDATE USING (
    organiser_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organiser_profiles op
      WHERE op.id = events.organiser_profile_id AND op.owner_id = auth.uid()
    )
  );

CREATE POLICY "Organiser members can update org events" ON public.events
  FOR UPDATE USING (
    organiser_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organiser_members om
      WHERE om.organiser_profile_id = events.organiser_profile_id
        AND om.user_id = auth.uid()
        AND om.status = 'accepted'
    )
  );

CREATE POLICY "Organiser owners can delete org events" ON public.events
  FOR DELETE USING (
    organiser_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organiser_profiles op
      WHERE op.id = events.organiser_profile_id AND op.owner_id = auth.uid()
    )
  );

CREATE POLICY "Organiser members can delete org events" ON public.events
  FOR DELETE USING (
    organiser_profile_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organiser_members om
      WHERE om.organiser_profile_id = events.organiser_profile_id
        AND om.user_id = auth.uid()
        AND om.status = 'accepted'
    )
  );
