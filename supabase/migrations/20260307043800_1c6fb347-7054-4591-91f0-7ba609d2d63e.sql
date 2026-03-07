-- Drop duplicate rate_limit indexes, keeping only one unique index per combination
DROP INDEX IF EXISTS idx_rate_limits_ip_window;
DROP INDEX IF EXISTS rate_limits_endpoint_ip_address_window_start_idx;
DROP INDEX IF EXISTS idx_rate_limits_ip_lookup;
DROP INDEX IF EXISTS idx_rate_limits_user_window;
DROP INDEX IF EXISTS rate_limits_endpoint_user_id_window_start_idx;
DROP INDEX IF EXISTS idx_rate_limits_lookup;