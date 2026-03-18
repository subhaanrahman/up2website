/**
 * Normalize phone to E.164 format for Twilio Verify and Supabase.
 * Always strips all non-digits and prepends + to avoid format mismatches
 * between send-otp, verify-otp, and forgot-password-check.
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `+${digits}` : phone;
}
