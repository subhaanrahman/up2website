-- Add unique constraints needed by check_rate_limit ON CONFLICT clauses
CREATE UNIQUE INDEX idx_rate_limits_endpoint_user_window 
  ON public.rate_limits (endpoint, user_id, window_start) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_rate_limits_endpoint_ip_window 
  ON public.rate_limits (endpoint, ip_address, window_start) 
  WHERE ip_address IS NOT NULL;