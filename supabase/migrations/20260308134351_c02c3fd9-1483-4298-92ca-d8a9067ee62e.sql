-- Update default notification expiry from 10 days to 20 days
ALTER TABLE public.notifications ALTER COLUMN expires_at SET DEFAULT (now() + interval '20 days');