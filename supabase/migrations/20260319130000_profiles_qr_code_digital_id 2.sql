-- Add qr_code to profiles for user digital ID / QR-based identification
-- Each profile gets a unique QR code for check-in, digital wallet, etc.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qr_code text NOT NULL DEFAULT gen_random_uuid()::text;

-- Ensure unique constraint (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_qr_code_key ON public.profiles (qr_code);
-- Profile QR code: each profile has a unique QR as their personal digital ID for check-in.
-- Used as their ticket to everything. Users can regenerate if compromised.
-- Backfill existing profiles, then add NOT NULL + default for new inserts.

-- 2. Backfill existing profiles with unique codes (PID = Profile ID, from profile id for uniqueness)
UPDATE public.profiles
SET qr_code = 'PID-' || replace(id::text, '-', '')
WHERE qr_code IS NULL;

-- 4. Add NOT NULL
ALTER TABLE public.profiles
  ALTER COLUMN qr_code SET NOT NULL;

-- 5. Default for new inserts (trigger for handle_new_user-created profiles)
CREATE OR REPLACE FUNCTION public.set_profile_qr_code_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    NEW.qr_code := 'PID-' || replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profile_qr_code_trigger ON public.profiles;
CREATE TRIGGER set_profile_qr_code_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_qr_code_default();

-- 6. Drop UNIQUE on tickets.qr_code — new tickets use profile QR; multiple per user share same code
-- Legacy tickets keep TKT-xxx; checkin-qr supports both.
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_qr_code_key;
