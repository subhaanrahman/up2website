# Auth Flow Review

Single reference for auth flows, dependencies, and failure modes.

---

## Flows

| Flow | Steps | Edge Functions | Frontend |
|------|-------|----------------|----------|
| **Phone sign-in** | Phone → check-phone → send-otp → verify-otp → (login or register) | check-phone, send-otp, verify-otp, login (or register) | Auth.tsx, PhoneStep, OtpStep, PasswordStep, RegisterStep |
| **Forgot password** | Phone → send-otp → forgot-password-check → forgot-password-reset | send-otp, forgot-password-check, forgot-password-reset | ForgotPasswordStep (OTP verify → new password) |
| **Dev login** | user_id → dev-login | dev-login | Auth.tsx (dev buttons) |

---

## Dependencies

### Edge functions (auth)

| Function | Secrets | DB / tables |
|----------|---------|-------------|
| check-phone | — | profiles |
| send-otp | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID | — |
| verify-otp | TWILIO_*, SEED_USER_PASSWORD (fallback) | auth.users, profiles |
| login | — | auth.users, profiles |
| register | — | auth.users, profiles |
| dev-login | SEED_USER_PASSWORD (fallback) | auth.users, profiles |
| forgot-password-check | TWILIO_* | profiles, password_reset_tokens |
| forgot-password-reset | — | password_reset_tokens, auth.users |

### Migrations / seeds

| Migration / seed | Used by |
|------------------|---------|
| `password_reset_tokens` | Forgot password flow |
| `auth_users_seed.sql` | Dev login, data_export (profiles FK) |
| `data_export.sql` | Dev login (profiles.phone for signInWithPassword fallback) |

---

## Failure Modes (root causes)

| Issue | Likely cause |
|-------|--------------|
| "Invalid or expired verification code" | (a) Reusing OTP from another flow (e.g. Phone-step OTP already consumed by verify-otp); (b) Using an old code after clicking Back and re-entering; (c) Phone format mismatch between send-otp and forgot-password-check (now fixed via E.164 normalization) |
| Send code button not working / stuck on OTP form | After error, user had no way to request a new code; now fixed with "Resend code" link and 60s cooldown |
| "localhost failed fetches" | `VITE_SUPABASE_URL` may point to localhost when Supabase is hosted; or CORS/wrong URL |
| Dev login "User not found" | Different migration needed: `auth_users_seed.sql` creates auth.users for Dylan/Haan. `password_reset_tokens` is only for forgot-password. Both are separate. Run auth_users_seed + set SEED_USER_PASSWORD |
| Dev login "SEED_USER_PASSWORD not set" | Add secret in Project Settings → Edge Functions → Secrets |
| Dev login "Profile missing phone" | Run data_export.sql after auth_users_seed |

---

## Twilio OTP behavior

- OTP codes are **single-use**. Once verified, they cannot be reused.
- The same `To` (phone) format must be used for both `VerificationCreate` (send-otp) and `VerificationCheck` (forgot-password-check). Both functions now normalize to E.164 before calling Twilio.

---

## Related docs

- [AUTH_SETUP_CHECKLIST.md](AUTH_SETUP_CHECKLIST.md) — copy-paste setup (migrations, functions, secrets)
- [SEEDING_GUIDE.md](SEEDING_GUIDE.md) — auth_users_seed vs password_reset_tokens, dev login options
