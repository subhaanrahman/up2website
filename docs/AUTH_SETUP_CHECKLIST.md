# Auth Setup Checklist

Copy-paste commands and steps to get auth working (dev login, forgot password, OTP).

---

## 0. Project consistency (critical)

**VITE_SUPABASE_URL in your `.env` must point to the SAME Supabase project where you run migrations and seed.**

If you have multiple projects (e.g. Lovable cloud vs Supabase CLI), the app will hit one project while your seed might be on another.

**Verify:**
1. Supabase Dashboard → Project Settings → API → copy **Project URL**
2. Compare with `.env`: `VITE_SUPABASE_URL` must match that URL exactly
3. All migrations (`password_reset_tokens`, `forgot_password_reset_fallback`) and `auth_users_seed.sql`, `data_export.sql` must be run on that same project

---

## 1. Database migrations

Apply in this order when needed:

| What | How |
|------|-----|
| **password_reset_tokens** (forgot password) | **Option A:** Supabase Dashboard → SQL Editor → paste contents of `supabase/migrations/20260318120000_password_reset_tokens.sql` → Run. **Option B:** `supabase db push` (if CLI linked). |
| **forgot_password_reset_fallback** (seeded users) | Run `supabase/migrations/20260318130000_forgot_password_reset_fallback.sql` in SQL Editor (or `supabase db push`). Required for forgot-password with auth_users_seed users. |
| **forgot_password_bcrypt_cost** (password compatibility) | Run `supabase/migrations/20260318140000_forgot_password_bcrypt_cost.sql` in SQL Editor (or `supabase db push`). Updates RPC to use bcrypt cost 10 for GoTrue compatibility. Re-run forgot-password after this to get a fresh hash. |
| **verify_auth_password** (login fallback) | Run `supabase/migrations/20260318150000_verify_auth_password.sql` in SQL Editor (or `supabase db push`). Enables login when signInWithPassword fails (e.g. pgcrypto-written hashes). |
| **verify_auth_password_return_phone** (login phone format) | Run `supabase/migrations/20260318160000_verify_auth_password_return_phone.sql` in SQL Editor. Returns auth.users.phone and email for signInWithPassword retry. |
| **bcrypt_cost6_compat** (seeded users login) | Run `supabase/migrations/20260318170000_bcrypt_cost6_compat.sql` in SQL Editor. Reverts to bcrypt cost 6 (matches auth_users_seed); cost 10 from pgcrypto can fail with GoTrue signInWithPassword. |
| **auth_users_token_columns** (fix "Database error querying schema") | Run `supabase/migrations/20260318180000_auth_users_token_columns.sql` in SQL Editor. Sets token columns to '' where NULL — required for raw-SQL users (supabase/auth#1940). |

**If you get "Password reset not configured" or "could not find the function" after running the migration:** PostgREST caches the schema. Run this in SQL Editor: `NOTIFY pgrst, 'reload schema';` — then try forgot-password again.
| **auth_users_seed** (dev login, Dylan/Haan) | Supabase Dashboard → SQL Editor → paste contents of `docs/auth_users_seed.sql` → Run. **Must run before** `data_export.sql`. |
| **data_export** (profiles, events, etc.) | Supabase Dashboard → SQL Editor → paste contents of `docs/data_export.sql` → Run. **After** auth_users_seed. |
| **auth_users_fix_phone** (only if you ran old auth seed) | Only if auth_users_seed was run before it had the phone column. Run `docs/auth_users_fix_phone.sql` once in SQL Editor. |

---

## 1b. Auth provider configuration (required for seeded-user login)

The login fallback uses `signInWithPassword(email: digits@phone.local)` when phone lookup fails with "Database error querying schema" (common for seeded users). This requires the **Email** provider to be enabled.

**Enable Email provider:**
1. Supabase Dashboard → **Authentication** → **Providers**
2. Find **Email** and ensure it is **Enabled**
3. You can leave "Confirm email" off if desired — the synthetic `@phone.local` addresses are internal only; users never see or use them

Without this, you will see `"Email logins are disabled"` in login logs and LOGIN_SESSION_FAILED on the frontend.

---

## 2. Edge Function deployment

Deploy all auth functions:

```bash
supabase functions deploy check-phone
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy login
supabase functions deploy register
supabase functions deploy dev-login
supabase functions deploy forgot-password-check
supabase functions deploy forgot-password-reset
```

Or deploy all at once:

```bash
supabase functions deploy
```

---

## 3. Edge Function secrets

Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Secret | Required for |
|--------|---------------|
| `TWILIO_ACCOUNT_SID` | send-otp, verify-otp, forgot-password-check |
| `TWILIO_AUTH_TOKEN` | send-otp, verify-otp, forgot-password-check |
| `TWILIO_VERIFY_SERVICE_SID` | send-otp, verify-otp, forgot-password-check |
| `SEED_USER_PASSWORD` | **Dev login** (required), verify-otp fallback |

**Dev login will not work without `SEED_USER_PASSWORD`.** Set it to `seedplaceholder1` to match `auth_users_seed.sql`. Must be the same project where you ran auth_users_seed and data_export.

CLI:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=<your-value>
supabase secrets set TWILIO_AUTH_TOKEN=<your-value>
supabase secrets set TWILIO_VERIFY_SERVICE_SID=<your-value>
supabase secrets set SEED_USER_PASSWORD=seedplaceholder1
```

---

## 4. Local .env

```
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
```

**Do not** use `http://localhost:54321` unless you are running `supabase start` and functions locally.

---

## 5. After code changes

- **If edge functions were changed:** Run `supabase functions deploy <function-name>` (or `supabase functions deploy`) again.
- **If new migrations were added:** Run the new migration SQL in Dashboard or `supabase db push`.

---

## 6. Debug checklist (if login or dev-login still fails)

- **RPC updated?** SQL Editor: `SELECT prosrc FROM pg_proc WHERE proname = 'update_auth_user_password';` — should show `gen_salt('bf', 10)`.
- **Password actually updated?** After reset, run: `SELECT id, LEFT(encrypted_password, 20) FROM auth.users WHERE id = '<user_id>';` — hash should change after a reset.
- **Stored phone format?** `SELECT id, phone FROM auth.users WHERE id = '<user_id>';` — compare with formats login tries.
- **SEED_USER_PASSWORD set?** Project Settings → Edge Functions → Secrets — must be `seedplaceholder1` for dev-login.

---

## Reference

- [docs/SEEDING_GUIDE.md](SEEDING_GUIDE.md) — auth_users_seed vs password_reset_tokens, dev login options
