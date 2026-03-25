CREATE TABLE IF NOT EXISTS public.image_telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type text NOT NULL,
  bucket text,
  preset text NOT NULL,
  surface text,
  delivery_mode text NOT NULL,
  load_status text NOT NULL,
  fallback_used boolean NOT NULL DEFAULT false,
  cache_hint text NOT NULL DEFAULT 'unknown',
  image_path text,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_image_telemetry_events_created_at
  ON public.image_telemetry_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_telemetry_events_surface_created_at
  ON public.image_telemetry_events (surface, created_at DESC);

CREATE OR REPLACE VIEW public.image_telemetry_daily_summary AS
SELECT
  date_trunc('day', created_at) AS day,
  asset_type,
  bucket,
  preset,
  COALESCE(surface, 'unknown') AS surface,
  delivery_mode,
  load_status,
  cache_hint,
  fallback_used,
  count(*) AS event_count
FROM public.image_telemetry_events
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9;

DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;

CREATE POLICY "Users can upload own post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Authenticated users can upload event flyers" ON storage.objects;

CREATE POLICY "Users can upload own event flyers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-flyers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Authenticated upload event media" ON storage.objects;

CREATE POLICY "Users can upload own event media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
