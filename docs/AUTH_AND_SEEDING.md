# Auth and Seeding Guide

Setup for auth flows (dev login, forgot password, OTP) and seeding profiles/events. Use this doc for copy-paste commands and troubleshooting.

---

## 1. Project consistency (critical)

**`VITE_SUPABASE_URL` in your `.env` must point to the SAME Supabase project where you run migrations and seed.**

If you have multiple projects (e.g. Lovable cloud vs Supabase CLI), the app will hit one project while your seed might be on another.

**Verify:**
1. Supabase Dashboard → Project Settings → API → copy **Project URL**
2. Compare with `.env`: `VITE_SUPABASE_URL` must match that URL exactly
3. All migrations and seeds must be run on that same project

---

## 2. Migrations (in order)

### Auth migrations

| Migration | Purpose |
|-----------|---------|
| `password_reset_tokens` | Forgot-password flow (OTP reset) |
| `forgot_password_reset_fallback` | Seeded users support for forgot-password |
| `forgot_password_bcrypt_cost` | bcrypt cost 10 for GoTrue compatibility |
| `verify_auth_password` | Login fallback when signInWithPassword fails |
| `verify_auth_password_return_phone` | Returns auth.users.phone/email for retry |
| `bcrypt_cost6_compat` | bcrypt cost 6 for seeded users (matches auth_users_seed) |
| `auth_users_token_columns` | Fix "Database error querying schema" for raw-SQL users |

**How to apply:** SQL Editor → paste migration contents → Run, or `supabase db push` (if CLI linked).

**PostgREST schema cache:** If you get "Password reset not configured" after migration, run in SQL Editor: `NOTIFY pgrst, 'reload schema';`

### Seeds (manual SQL)

| File | When | Purpose |
|------|------|---------|
| `docs/supabase/auth_users_seed.sql` | **First** | Creates auth.users + identities for data_export user_ids. Required for dev login + data_export. |
| `docs/supabase/data_export.sql` | **After** auth_users_seed | Profiles, events, posts, rsvps, etc. |
| `docs/supabase/auth_users_fix_phone.sql` | Only if old auth seed | If you ran auth_users_seed before it had the phone column, run once to populate phone/phone_confirmed_at. |

**Prerequisites:**

| Feature | Requires | Does NOT use |
|---------|----------|--------------|
| Dev login (Dylan/Haan) | auth_users_seed + `SEED_USER_PASSWORD` secret | password_reset_tokens |
| Forgot password (OTP reset) | password_reset_tokens migration | auth_users_seed for the flow itself |
| Data export | auth_users_seed first, then data_export | — |

---

## 3. Auth provider configuration

The login fallback uses `signInWithPassword(email: digits@phone.local)` when phone lookup fails (common for seeded users). Requires **Email** provider enabled.

**Enable Email provider:**
1. Supabase Dashboard → **Authentication** → **Providers**
2. Find **Email** and ensure it is **Enabled**
3. "Confirm email" can stay off — the `@phone.local` addresses are internal only

Without this, you get `"Email logins are disabled"` and LOGIN_SESSION_FAILED on the frontend.

---

## 4. Edge function deployment

```bash
supabase functions deploy
```

Or individually:

```bash
supabase functions deploy check-phone send-otp verify-otp login register dev-login forgot-password-check forgot-password-reset
```

---

## 5. Secrets

Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Secret | Required for |
|--------|--------------|
| `TWILIO_ACCOUNT_SID` | send-otp, verify-otp, forgot-password-check |
| `TWILIO_AUTH_TOKEN` | send-otp, verify-otp, forgot-password-check |
| `TWILIO_VERIFY_SERVICE_SID` | send-otp, verify-otp, forgot-password-check |
| `SEED_USER_PASSWORD` | Dev login (required), verify-otp fallback |

**Dev login requires `SEED_USER_PASSWORD`.** Set to `seedplaceholder1` to match `auth_users_seed.sql`.

CLI:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=<value> TWILIO_AUTH_TOKEN=<value> TWILIO_VERIFY_SERVICE_SID=<value> SEED_USER_PASSWORD=seedplaceholder1
```

---

## 6. Seed order (step by step)

1. In Supabase Dashboard → SQL Editor, paste and run `docs/supabase/auth_users_seed.sql`
2. Then paste and run `docs/supabase/data_export.sql`

---

## 7. Auth flows reference

| Flow | Edge Functions | Notes |
|------|----------------|-------|
| Phone sign-in | check-phone → send-otp → verify-otp → login/register | Auth.tsx, PhoneStep, OtpStep, PasswordStep |
| Forgot password | send-otp → forgot-password-check → forgot-password-reset | ForgotPasswordStep |
| Dev login | dev-login | user_id → dev-login (requires SEED_USER_PASSWORD) |

### Dependencies

| Function | Secrets | DB |
|----------|---------|-----|
| check-phone | — | profiles |
| send-otp, verify-otp | TWILIO_*, SEED_USER_PASSWORD (verify fallback) | auth.users, profiles |
| login, register | — | auth.users, profiles |
| dev-login | SEED_USER_PASSWORD | auth.users, profiles |
| forgot-password-check | TWILIO_* | profiles, password_reset_tokens |
| forgot-password-reset | — | password_reset_tokens, auth.users |

### Twilio OTP behaviour

- OTP codes are **single-use**. Once verified, they cannot be reused.
- Same E.164 phone format must be used for send-otp and forgot-password-check.

---

## 8. Logging in after seeding

**Option A — dev-login (recommended):**

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/dev-login \
  -H "Content-Type: application/json" \
  -d '{"user_id":"1eafb563-071a-45c6-a82e-79b460b3a851"}'
```

Returns `access_token` and `refresh_token`. Dylan's user_id: `1eafb563-071a-45c6-a82e-79b460b3a851`.

**Option B — Phone + password:** Seed sets password `seedplaceholder1` for all users. Use `signInWithPassword` with phone (e.g. `61405826420`).

**Option C — Phone + OTP:** Requires `SEED_USER_PASSWORD` secret so verify-otp can fallback to signInWithPassword.

---

## 9. Troubleshooting

| Issue | Likely cause |
|-------|--------------|
| "Invalid or expired verification code" | (a) Reused OTP from another flow; (b) Old code after clicking Back; (c) Phone format mismatch (both now E.164) |
| Send code button stuck | Use "Resend code" link; 60s cooldown |
| "localhost failed fetches" | `VITE_SUPABASE_URL` points to localhost when Supabase is hosted; or CORS |
| Dev login "User not found" | Run `auth_users_seed.sql` + set `SEED_USER_PASSWORD` |
| Dev login "SEED_USER_PASSWORD not set" | Add in Project Settings → Edge Functions → Secrets |
| Dev login "Profile missing phone" | Run `data_export.sql` after auth_users_seed |
| profiles FK violation on data_export | Run auth_users_seed first |

### Debug checklist (login/dev-login fails)

- **RPC updated?** SQL Editor: `SELECT prosrc FROM pg_proc WHERE proname = 'update_auth_user_password';` — should show `gen_salt('bf', 10)`.
- **Password updated?** After reset: `SELECT id, LEFT(encrypted_password, 20) FROM auth.users WHERE id = '<user_id>';` — hash should change.
- **Stored phone format?** `SELECT id, phone FROM auth.users WHERE id = '<user_id>';`
- **SEED_USER_PASSWORD set?** Must be `seedplaceholder1` for dev-login.

---

## Local .env

```
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
```

Do not use `http://localhost:54321` unless running `supabase start` locally.

---

## After code changes

- **Edge functions changed:** `supabase functions deploy` (or deploy specific function)
- **New migrations:** Run migration SQL in Dashboard or `supabase db push`

---

## Related docs

- [docs/supabase/README.md](supabase/README.md) — SQL seeds, MCP setup, migration repair
