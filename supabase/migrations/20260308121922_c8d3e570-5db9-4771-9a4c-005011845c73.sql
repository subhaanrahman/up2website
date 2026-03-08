-- Grant SELECT to anon for public read access (RLS policies already scope this)
GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT ON public.post_reposts TO anon;