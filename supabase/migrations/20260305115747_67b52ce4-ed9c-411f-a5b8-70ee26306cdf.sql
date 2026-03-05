
ALTER TABLE public.posts ADD COLUMN image_url text;
ALTER TABLE public.posts ADD COLUMN gif_url text;
ALTER TABLE public.posts ALTER COLUMN content DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_post_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.content IS NULL OR trim(NEW.content) = '')
     AND NEW.image_url IS NULL
     AND NEW.gif_url IS NULL THEN
    RAISE EXCEPTION 'Post must have content, image, or GIF';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_post_content
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_post_content();

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);
