CREATE POLICY "Attendees of public events can view guest list"
ON public.rsvps FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = rsvps.event_id 
    AND events.is_public = true
  )
);