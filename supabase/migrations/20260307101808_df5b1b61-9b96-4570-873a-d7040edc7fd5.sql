-- Create the event-flyers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-flyers', 'event-flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload flyers
CREATE POLICY "Authenticated users can upload event flyers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-flyers');

-- Allow public read access
CREATE POLICY "Public can view event flyers"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'event-flyers');

-- Allow owners to delete their flyers
CREATE POLICY "Users can delete own event flyers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-flyers' AND auth.uid()::text = (storage.foldername(name))[1]);