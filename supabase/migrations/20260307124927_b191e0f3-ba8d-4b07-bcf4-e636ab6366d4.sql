-- Update check_rate_limit to use partial index WHERE clauses in ON CONFLICT
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
SET search_path TO 'public'
AS $function$
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
    ON CONFLICT (endpoint, user_id, window_start) WHERE user_id IS NOT NULL
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_count;

    RETURN v_count <= p_max_requests;
  END IF;

  IF p_ip_address IS NOT NULL THEN
    INSERT INTO rate_limits (ip_address, endpoint, window_start, request_count)
    VALUES (p_ip_address, p_endpoint, v_window_start, 1)
    ON CONFLICT (endpoint, ip_address, window_start) WHERE ip_address IS NOT NULL
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_count;

    RETURN v_count <= p_max_requests;
  END IF;

  RETURN true;
END;
$function$;