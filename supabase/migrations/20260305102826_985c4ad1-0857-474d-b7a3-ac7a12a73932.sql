ALTER TABLE public.profiles ADD COLUMN phone text UNIQUE;
CREATE INDEX idx_profiles_phone ON public.profiles (phone);