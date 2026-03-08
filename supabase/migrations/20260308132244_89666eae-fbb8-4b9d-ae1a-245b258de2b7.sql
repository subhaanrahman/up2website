-- Add reaction_type column to post_likes (default 'heart' for backward compat)
ALTER TABLE public.post_likes
ADD COLUMN reaction_type text NOT NULL DEFAULT 'heart';

-- Drop existing unique constraint if any, then add one for post_id + user_id
-- (user can only have ONE reaction per post, but can change the type)
DO $$
BEGIN
  -- Try dropping any existing unique index on (post_id, user_id)
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'post_likes'
    AND indexdef LIKE '%post_id%'
    AND indexdef LIKE '%user_id%'
    AND indexdef LIKE '%UNIQUE%'
  ) THEN
    -- The constraint name might vary, use a dynamic approach
    EXECUTE (
      SELECT 'ALTER TABLE public.post_likes DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'public.post_likes'::regclass
      AND contype = 'u'
      LIMIT 1
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Ensure unique constraint exists
CREATE UNIQUE INDEX IF NOT EXISTS post_likes_post_user_unique ON public.post_likes (post_id, user_id);