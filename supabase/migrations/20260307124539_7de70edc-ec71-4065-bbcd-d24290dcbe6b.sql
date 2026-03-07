-- Add unique indexes for ON CONFLICT resolution in check_rate_limit function
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_endpoint_user_window_idx
  ON public.rate_limits (endpoint, user_id, window_start)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_endpoint_ip_window_idx
  ON public.rate_limits (endpoint, ip_address, window_start)
  WHERE ip_address IS NOT NULL;