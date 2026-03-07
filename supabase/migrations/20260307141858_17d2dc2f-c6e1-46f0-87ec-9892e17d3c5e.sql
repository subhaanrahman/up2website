
-- Add event_id to posts so posts can be linked to events
ALTER TABLE public.posts ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

-- Create post_collaborators table
CREATE TABLE public.post_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_collaborators ENABLE ROW LEVEL SECURITY;

-- Everyone can see collaborators
CREATE POLICY "Anyone can view post collaborators"
  ON public.post_collaborators FOR SELECT
  TO authenticated
  USING (true);

-- Post author can add collaborators
CREATE POLICY "Post author can add collaborators"
  ON public.post_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_collaborators.post_id AND posts.author_id = auth.uid())
  );

-- Post author or collaborator themselves can remove
CREATE POLICY "Author or self can remove collaborator"
  ON public.post_collaborators FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_collaborators.post_id AND posts.author_id = auth.uid())
  );
