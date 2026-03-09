
-- Add publish_at column for scheduled event publishing
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS publish_at timestamp with time zone DEFAULT NULL;

-- Comment: When status='scheduled' and publish_at is set, the event will auto-publish at that time
