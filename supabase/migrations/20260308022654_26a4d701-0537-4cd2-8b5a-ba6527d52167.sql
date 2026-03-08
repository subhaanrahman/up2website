
-- Event media table for photo galleries
CREATE TABLE public.event_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view event media for public events
CREATE POLICY "Public can view event media"
  ON public.event_media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM events WHERE events.id = event_media.event_id AND events.is_public = true
  ));

-- Host/organiser owner can manage media
CREATE POLICY "Host can manage event media"
  ON public.event_media FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events WHERE events.id = event_media.event_id AND events.host_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM events e
    JOIN organiser_profiles op ON op.id = e.organiser_profile_id
    WHERE e.id = event_media.event_id AND op.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events WHERE events.id = event_media.event_id AND events.host_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM events e
    JOIN organiser_profiles op ON op.id = e.organiser_profile_id
    WHERE e.id = event_media.event_id AND op.owner_id = auth.uid()
  ));

-- Storage bucket for event media
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read
CREATE POLICY "Public read event media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-media');

-- Storage RLS: authenticated can upload
CREATE POLICY "Authenticated upload event media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-media' AND auth.uid() IS NOT NULL);

-- Storage RLS: uploader can delete
CREATE POLICY "Uploader can delete event media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-media' AND (storage.foldername(name))[1] = auth.uid()::text);
