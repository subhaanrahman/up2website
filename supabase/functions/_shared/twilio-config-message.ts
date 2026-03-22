/**
 * Use as the main `error` string when Twilio env vars are missing.
 * Supabase Functions clients often receive only `error` + `request_id` from invoke — not `code` or `details`.
 */
export const TWILIO_NOT_CONFIGURED_MESSAGE =
  "SMS service not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID under Project Settings → Edge Functions → Secrets (Auth → Phone does not apply to Edge). Then redeploy send-otp and verify-otp.";
