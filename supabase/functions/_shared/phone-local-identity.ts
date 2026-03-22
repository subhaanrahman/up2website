/**
 * Phone-derived internal auth identity: `{digits}@phone.local` (same as register).
 * Used by verify-otp candidate list when matching auth.users.email.
 */

export function phoneLocalIdentityEmail(digits: string): string {
  return `${digits.replace(/\D/g, "")}@phone.local`;
}

/**
 * Possible `digits@phone.local` forms for the same handset (US NANP, AU 04 vs 61, etc.).
 */
export function phoneLocalIdentityVariants(phoneDigits: string): string[] {
  const d = phoneDigits.replace(/\D/g, "");
  const out = new Set<string>();
  if (d) out.add(phoneLocalIdentityEmail(d));
  if (d.length === 11 && d.startsWith("1")) out.add(phoneLocalIdentityEmail(d.slice(1)));
  if (d.length === 10 && !d.startsWith("0")) out.add(phoneLocalIdentityEmail(`1${d}`));
  if (d.length === 11 && d.startsWith("61") && d[2] === "4") {
    out.add(phoneLocalIdentityEmail(`0${d.slice(2)}`));
  }
  if (d.length === 10 && d.startsWith("04")) {
    out.add(phoneLocalIdentityEmail(`61${d.slice(1)}`));
  }
  return [...out];
}

/** Same as {@link phoneLocalIdentityVariants} but drops emails already tried (e.g. canonical from RPC). */
export function phoneLocalIdentityVariantsExcluding(phoneDigits: string, excludeEmails: string[]): string[] {
  const ex = new Set(excludeEmails.map((e) => e.trim()).filter(Boolean));
  return phoneLocalIdentityVariants(phoneDigits).filter((e) => !ex.has(e));
}

/** Safe for Edge logs (not returned to clients). */
export function redactEmailForLog(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "[invalid]";
  const safe = local.length <= 2 ? "***" : `${local[0]}***${local.slice(-1)}`;
  return `${safe}@${domain}`;
}
