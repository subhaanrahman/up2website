-- Add qr_code to profiles for user digital ID / QR-based identification
-- Each profile gets a unique QR code for check-in, digital wallet, etc.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS qr_code text NOT NULL DEFAULT gen_random_uuid()::text;

-- Ensure unique constraint (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_qr_code_key ON public.profiles (qr_code);
