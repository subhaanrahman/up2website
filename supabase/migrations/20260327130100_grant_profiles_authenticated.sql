-- Runtime: PostgREST returned 42501 "permission denied for table profiles" for JWT role authenticated
-- (RLS never runs without table GRANT). Anon had SELECT from 20260328120000; ensure authenticated does too.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
