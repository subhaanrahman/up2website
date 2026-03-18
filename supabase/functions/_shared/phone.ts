/**
 * Normalize phone to strict E.164 (no spaces, only + and digits).
 * Twilio Verify requires identical format for VerificationCreate and VerificationCheck.
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `+${digits}` : phone;
}
