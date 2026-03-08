-- Add opening_hours (JSONB, for venue accounts) and tags (JSONB, for genre/crowd/features) to organiser_profiles
ALTER TABLE public.organiser_profiles
  ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Add email_verified column to profiles for optional email MFA
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;