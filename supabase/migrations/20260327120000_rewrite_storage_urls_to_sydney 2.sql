-- One-off: rewrite embedded Supabase Storage/API hostnames to the Sydney project.
-- Safe to re-run: replace is idempotent when source URL no longer matches.

DO $$
DECLARE
  new_host text := 'https://fxcosnsbaaktblmnvycv.supabase.co';
  old_host text;
  old_hosts text[] := ARRAY[
    'https://dcjymbpjmbfoikqjrmuo.supabase.co',
    'https://ydyocznljcsimqbkfaip.supabase.co'
  ];
BEGIN
  FOREACH old_host IN ARRAY old_hosts
  LOOP
    UPDATE public.profiles
    SET avatar_url = replace(avatar_url, old_host, new_host)
    WHERE avatar_url IS NOT NULL AND avatar_url LIKE '%' || old_host || '%';

    UPDATE public.organiser_profiles
    SET avatar_url = replace(avatar_url, old_host, new_host)
    WHERE avatar_url IS NOT NULL AND avatar_url LIKE '%' || old_host || '%';

    UPDATE public.events
    SET cover_image = replace(cover_image, old_host, new_host)
    WHERE cover_image IS NOT NULL AND cover_image LIKE '%' || old_host || '%';

    UPDATE public.posts
    SET image_url = replace(image_url, old_host, new_host)
    WHERE image_url IS NOT NULL AND image_url LIKE '%' || old_host || '%';

    UPDATE public.event_media
    SET url = replace(url, old_host, new_host)
    WHERE url LIKE '%' || old_host || '%';
  END LOOP;
END $$;
