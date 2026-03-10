
-- Allow anon (unauthenticated) users to read posts
CREATE POLICY "Anon can view posts"
  ON public.posts FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to read basic profile metadata (needed to resolve author names/avatars)
CREATE POLICY "Anon can view profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to read organiser profiles (needed for organiser post attribution)
CREATE POLICY "Anon can view organiser profiles"
  ON public.organiser_profiles FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to read post_collaborators (needed for collaborator display)
CREATE POLICY "Anon can view post collaborators"
  ON public.post_collaborators FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to read post_reposts (needed for repost display in public feed)
CREATE POLICY "Anon can view reposts"
  ON public.post_reposts FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to view public events (for nearby events on guest feed)
CREATE POLICY "Anon can view public events"
  ON public.events FOR SELECT
  TO anon
  USING (is_public = true);
