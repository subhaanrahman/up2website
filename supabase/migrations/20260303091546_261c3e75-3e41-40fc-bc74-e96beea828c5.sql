
-- Add profile columns for user registration data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Email format validation constraint (drop first if exists from partial previous run)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_format') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_format 
      CHECK (email IS NULL OR email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
  END IF;
END $$;

-- Unique constraint on email (optional but must be unique if provided)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- Rate limits unique indexes for ON CONFLICT to work
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_endpoint_user_id_window_start_idx 
  ON public.rate_limits (endpoint, user_id, window_start) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_endpoint_ip_address_window_start_idx 
  ON public.rate_limits (endpoint, ip_address, window_start) 
  WHERE ip_address IS NOT NULL;
