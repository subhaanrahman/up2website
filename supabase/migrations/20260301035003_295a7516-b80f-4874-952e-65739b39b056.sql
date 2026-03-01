
-- =============================================================
-- 1. Rate-limiting infrastructure
-- =============================================================

CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address text,
  endpoint text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup
  ON public.rate_limits (endpoint, user_id, window_start);
CREATE INDEX idx_rate_limits_ip_lookup
  ON public.rate_limits (endpoint, ip_address, window_start);

-- RLS: no client access at all — only SECURITY DEFINER functions touch this
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- (no policies = total deny for anon/authenticated roles)

-- Cleanup: auto-delete old windows (anything > 10 min old)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limits WHERE window_start < now() - interval '10 minutes';
$$;

-- Core check function: returns true if ALLOWED, false if BLOCKED
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_max_requests integer DEFAULT 30,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  -- Periodically clean up (1 in 20 chance to avoid every-call overhead)
  IF random() < 0.05 THEN
    PERFORM cleanup_old_rate_limits();
  END IF;

  v_window_start := date_trunc('minute', now())
    + (floor(extract(second from now()) / p_window_seconds) * p_window_seconds) * interval '1 second';

  -- Try user-based limiting first
  IF p_user_id IS NOT NULL THEN
    INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
    VALUES (p_user_id, p_endpoint, v_window_start, 1)
    ON CONFLICT DO NOTHING;

    -- Since we can't rely on unique constraint easily, do upsert via update
    UPDATE rate_limits
       SET request_count = request_count + 1
     WHERE endpoint = p_endpoint
       AND user_id = p_user_id
       AND window_start = v_window_start
    RETURNING request_count INTO v_count;

    IF v_count IS NULL THEN
      INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
      VALUES (p_user_id, p_endpoint, v_window_start, 1)
      RETURNING request_count INTO v_count;
    END IF;

    RETURN v_count <= p_max_requests;
  END IF;

  -- Fall back to IP-based limiting
  IF p_ip_address IS NOT NULL THEN
    UPDATE rate_limits
       SET request_count = request_count + 1
     WHERE endpoint = p_endpoint
       AND ip_address = p_ip_address
       AND window_start = v_window_start
    RETURNING request_count INTO v_count;

    IF v_count IS NULL THEN
      INSERT INTO rate_limits (ip_address, endpoint, window_start, request_count)
      VALUES (p_ip_address, p_endpoint, v_window_start, 1)
      RETURNING request_count INTO v_count;
    END IF;

    RETURN v_count <= p_max_requests;
  END IF;

  -- No identifier provided — allow (shouldn't happen)
  RETURN true;
END;
$$;

-- Add unique-ish constraint to support upsert pattern
CREATE UNIQUE INDEX idx_rate_limits_user_window
  ON public.rate_limits (endpoint, user_id, window_start)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_rate_limits_ip_window
  ON public.rate_limits (endpoint, ip_address, window_start)
  WHERE ip_address IS NOT NULL;

-- Now redo the insert logic to use ON CONFLICT properly
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_max_requests integer DEFAULT 30,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF random() < 0.05 THEN
    PERFORM cleanup_old_rate_limits();
  END IF;

  v_window_start := date_trunc('minute', now())
    + (floor(extract(second from now()) / p_window_seconds) * p_window_seconds) * interval '1 second';

  IF p_user_id IS NOT NULL THEN
    INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
    VALUES (p_user_id, p_endpoint, v_window_start, 1)
    ON CONFLICT (endpoint, user_id, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_count;

    RETURN v_count <= p_max_requests;
  END IF;

  IF p_ip_address IS NOT NULL THEN
    INSERT INTO rate_limits (ip_address, endpoint, window_start, request_count)
    VALUES (p_ip_address, p_endpoint, v_window_start, 1)
    ON CONFLICT (endpoint, ip_address, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_count;

    RETURN v_count <= p_max_requests;
  END IF;

  RETURN true;
END;
$$;

-- =============================================================
-- 2. Lock down rsvps: revoke client INSERT/UPDATE/DELETE
-- =============================================================

-- Drop the permissive INSERT, UPDATE, DELETE policies
DROP POLICY IF EXISTS "Users can RSVP to events" ON public.rsvps;
DROP POLICY IF EXISTS "Users can update own RSVP" ON public.rsvps;
DROP POLICY IF EXISTS "Users can delete own RSVP" ON public.rsvps;

-- SELECT policy stays — clients can still read their RSVPs
-- All writes now go exclusively through rsvp_join / rsvp_leave SECURITY DEFINER RPCs
