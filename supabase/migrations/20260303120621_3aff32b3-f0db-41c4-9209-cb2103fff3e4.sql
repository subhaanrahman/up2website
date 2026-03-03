ALTER TABLE public.profiles ADD COLUMN instagram_handle text DEFAULT NULL;

-- Add length constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_instagram_handle_length CHECK (char_length(instagram_handle) <= 30);