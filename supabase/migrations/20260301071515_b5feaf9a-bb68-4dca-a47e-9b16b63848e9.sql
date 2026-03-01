
-- Revoke all DML from anon + authenticated on tables that must only be written via SECURITY DEFINER functions / Edge Functions

-- point_transactions: written only by award_points RPC
REVOKE INSERT, UPDATE, DELETE ON public.point_transactions FROM anon, authenticated;

-- user_points: INSERT allowed via award_points RPC only (revoke direct)
REVOKE INSERT, UPDATE, DELETE ON public.user_points FROM anon, authenticated;

-- user_badges: written only by award_points RPC
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM anon, authenticated;

-- user_vouchers: written only by award_points RPC (UPDATE still via RLS for status changes, but let SECURITY DEFINER handle it)
REVOKE INSERT, UPDATE, DELETE ON public.user_vouchers FROM anon, authenticated;

-- orders: written only by orders-reserve / payments-intent Edge Functions
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;

-- rsvps: written only by rsvp_join / rsvp_leave SECURITY DEFINER functions
REVOKE INSERT, UPDATE, DELETE ON public.rsvps FROM anon, authenticated;

-- rate_limits: accessed only by check_rate_limit SECURITY DEFINER function
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
