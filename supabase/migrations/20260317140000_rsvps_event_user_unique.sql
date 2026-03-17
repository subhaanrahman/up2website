-- Ensure unique (event_id, user_id) on rsvps for webhook upsert and atomic operations
CREATE UNIQUE INDEX IF NOT EXISTS rsvps_event_id_user_id_key ON public.rsvps (event_id, user_id);
