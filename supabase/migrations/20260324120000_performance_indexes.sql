-- Performance indexes aligned with app query patterns (events list, connections, notifications unread, profile feed, event board).
-- See docs/PERFORMANCE.md for pg_stat_statements verification after deploy.

-- Published events ordered by event_date (list/search paths in eventsRepository)
CREATE INDEX IF NOT EXISTS idx_events_status_event_date
  ON public.events (status, event_date ASC);

-- Organiser dashboards: events by venue + date (nullable organiser_profile_id: partial keeps index small)
CREATE INDEX IF NOT EXISTS idx_events_organiser_profile_event_date
  ON public.events (organiser_profile_id, event_date DESC)
  WHERE organiser_profile_id IS NOT NULL;

-- Friend graph: accepted + pending inbox queries (connectionsRepository)
CREATE INDEX IF NOT EXISTS idx_connections_requester_status
  ON public.connections (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_connections_addressee_status_created
  ON public.connections (addressee_id, status, created_at DESC);

-- Unread notifications / badge counts (partial index)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;

-- Profile feed: posts by author + recency (complements idx_posts_author + idx_posts_created)
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at
  ON public.posts (author_id, created_at DESC);

-- Event board ordering
CREATE INDEX IF NOT EXISTS idx_event_messages_event_created
  ON public.event_messages (event_id, created_at ASC);

-- Tickets / "my RSVPs" style queries
CREATE INDEX IF NOT EXISTS idx_rsvps_user_status
  ON public.rsvps (user_id, status);

-- Follower counts and organiser follower lists
CREATE INDEX IF NOT EXISTS idx_organiser_followers_organiser_id
  ON public.organiser_followers (organiser_profile_id);
