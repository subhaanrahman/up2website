-- Hosted / restored DBs: role `authenticated` must have table privileges before RLS applies.
-- Anon-only repair (20260328120000) fixed guest reads; logged-in users use `authenticated`.
-- Broad grant + narrow revoke matches intentional lockdowns in 20260301071515 and 20260303230749.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Re-apply DML lockdowns (writes via SECURITY DEFINER / Edge only)
REVOKE INSERT, UPDATE, DELETE ON public.point_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_points FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_vouchers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rsvps FROM anon, authenticated;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.organiser_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.organiser_profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.event_cohosts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.event_cohosts FROM authenticated;
