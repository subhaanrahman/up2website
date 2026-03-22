-- Add tickets_available_until for ticket sales end date/time
-- Default: null = close 1 min before event start
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tickets_available_until timestamp with time zone DEFAULT NULL;
