export const PASSWORD_RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "At least 1 letter", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "At least 1 number", test: (p: string) => /\d/.test(p) },
  { label: "At least 1 special character", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export function allPasswordRulesPass(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
