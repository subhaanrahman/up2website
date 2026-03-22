-- Add venue_name and address to events for proper venue + address support
-- venue_name: e.g. "The Ritz", "Madison Square Garden"
-- address: full address e.g. "123 Main St, Sydney, NSW 2000"
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;
