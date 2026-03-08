-- Grant DML privileges on post_likes to authenticated users
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;

-- Grant DML privileges on post_reposts to authenticated users
GRANT SELECT, INSERT, DELETE ON public.post_reposts TO authenticated;