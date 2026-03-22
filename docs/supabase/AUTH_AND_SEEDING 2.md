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

**`42501` / `permission denied for table …` (logged-in user):** The `authenticated` role must have **table** `GRANT`s before RLS runs. After a project move, you may need [`20260327130100_grant_profiles_authenticated.sql`](../../supabase/migrations/20260327130100_grant_profiles_authenticated.sql) for `profiles`, and [`20260330120000_grant_authenticated_public_tables.sql`](../../supabase/migrations/20260330120000_grant_authenticated_public_tables.sql) so `events`, `connections`, `posts`, `rsvps` (SELECT only after revokes), etc. are usable. If **`connections`** or social **RPC** counts still fail, apply [`20260330130000_connections_grants_and_social_rpc_execute.sql`](../../supabase/migrations/20260330130000_connections_grants_and_social_rpc_execute.sql) (explicit `connections` + `EXECUTE` on count functions + `NOTIFY pgrst, 'reload schema'`). Apply with `supabase db push` or run the SQL in the Dashboard SQL Editor, then reload the app.

**Friend count works but Friends list is empty:** RLS on `profiles` only allowed owner + “public” profiles ([`20260228125734`](../../supabase/migrations/20260228125734_d48d1c58-c193-48e1-88a9-e0171f177db2.sql)). Apply [`20260331120000_profiles_select_for_accepted_connections.sql`](../../supabase/migrations/20260331120000_profiles_select_for_accepted_connections.sql) so accepted friends can read each other’s profile rows. **Search** still only surfaces profiles you may SELECT (public, or friends after this policy); **notifications** are per-row `user_id` — old alerts won’t exist until that data is migrated into the new project.

**Stale browser session after changing `VITE_*`:** If you point the app at a **new** project but the browser still has tokens from the **old** project, PostgREST returns **permission denied** / RLS failures on almost every table. The app validates the JWT against `VITE_SUPABASE_URL` on load and signs you out if the issuer does not match; if you still see issues, sign out manually, restart the dev server, and sign in again so `localStorage` only holds tokens for the current project.

### Phone OTP (Twilio)

Sign-in SMS uses **Edge Functions** (`send-otp`, `verify-otp`). Configuring Twilio only under **Authentication → Providers → Phone** does **not** supply credentials to those functions. Set **`TWILIO_ACCOUNT_SID`**, **`TWILIO_AUTH_TOKEN`**, and **`TWILIO_VERIFY_SERVICE_SID`** under **Project Settings → Edge Functions → Secrets**, then redeploy `send-otp` and `verify-otp`. Full steps: [`TWILIO_EDGE_SECRETS.md`](TWILIO_EDGE_SECRETS.md).

**Phone-only sign-in vs `auth.users.email`:** Supabase Auth (GoTrue) always stores an **`email`** column on `auth.users`. This app does **not** use inbox email for OTP login. Registration sets **`{digits}@phone.local`** (same as seeds) as that internal identity; **`verify-otp`** issues a session using that phone-derived value only (Admin `generateLink` + `verifyOtp` — no `getUserById`, no profile email). Optional verified email in **Settings** is separate (MFA / recovery), not part of the SMS OTP path.

### “Create your account” when you already have an account (new Supabase project)

Auth data is **per project**. After a **region / project change**, you must **migrate** `auth.users`, `profiles`, and related rows—or sign up again on the new project.

The **`check-phone`** function treats you as a returning user if **`profiles.phone`** matches **or** `auth.users` has the same phone (digit-normalized). If you still see the registration step after applying migrations [`20260328120000_anon_feed_grants_and_phone_in_auth.sql`](../../supabase/migrations/20260328120000_anon_feed_grants_and_phone_in_auth.sql), confirm your phone exists under **Authentication → Users** in the **same** project as `VITE_SUPABASE_URL`, then redeploy **`check-phone`**.

**OTP step: “Couldn’t sign you in with this code” (returning user):** `verify-otp` must issue tokens when **`check-phone`** said you exist. Apply [`20260329120000_auth_user_id_for_phone_digits.sql`](../../supabase/migrations/20260329120000_auth_user_id_for_phone_digits.sql) (`auth_user_id_for_phone_digits` RPC), run `supabase db push` (or SQL Editor), then redeploy **`verify-otp`** so it can resolve `user_id` from **`auth.users`** when **`profiles.phone`** format differs.

**`_debug: session_failed_phone_identity_or_seed`:** `generateLink` must use the **exact** `auth.users.email` (often `digits@phone.local`, but digit length can differ from E.164). Apply [`20260329130000_auth_email_for_user_id.sql`](../../supabase/migrations/20260329130000_auth_email_for_user_id.sql) (`auth_email_for_user_id` RPC), `supabase db push`, redeploy **`verify-otp`**.

**`sessionDiag.hadSessionUserMismatch`:** If **`true`** while **`lastVerifyOtpError`** is null, the session was created but **`profiles.user_id`** did not match the resolved user (stale/wrong profile row for that phone). **`verify-otp`** accepts the session when **`auth_user_id_for_phone_digits`** matches the session user (Twilio-verified phone is canonical). **`jwtSub`** vs **`sessionObjectUserId`** in logs: if they differ, GoTrue returned a **`session.user`** that disagreed with the access token’s **`sub`**; the Edge function **prefers `sub`**. **`lastSeedError`: `Database error querying schema`** is a GoTrue/Auth internal DB issue—run [`20260318180000_auth_users_token_columns.sql`](../../supabase/migrations/20260318180000_auth_users_token_columns.sql) (or related auth migrations) and/or Supabase support; JWT **`sub`** is used when **`getUser`** fails.

**Two `auth.users` rows for one handset (e.g. `04...@phone.local` and `61...@phone.local`):** `auth_user_id_for_phone_digits` returns one id; alternate digit forms are **different** `auth.users.email` values and can sign in a **different** uuid. When **`auth_email_for_user_id`** returns a non-empty email, **`verify-otp`** uses **only** that canonical address for `generateLink` — it **does not** fall back to other `...@phone.local` forms (`sessionDiag.skippedPhoneLocalVariants: true`). That avoids “wrong account” sessions when GoTrue fails on the canonical email but would succeed on another duplicate’s email. **`sessionDiag.lastGenerateLinkError`** (e.g. `Database error finding user`) must be fixed in Auth/GoTrue or schema; merge or delete duplicate **`auth.users`** rows so one number maps to one account.

### OTP session diagnostics (operators)

When Twilio approves the code but login still fails, use this order—**do not** rely on the generic error line alone. After recent changes, **`verify-otp`** logs a structured **`sessionDiag`** object on failure (candidates tried, last `generateLink` / `verifyOtp` errors, **`skippedPhoneLocalVariants`**, **`interopVersion`** / **`generateLinkUserId`**, seed fallback, etc.). The JSON body may include **`_verify_otp_interop`** next to **`_debug`** — if that string is missing or stale, the project is not running the latest **`verify-otp`** deployment.

1. **SQL (SQL Editor, same project as the app)** — confirm the row `verify-otp` is targeting:

   ```sql
   select id, email, phone, email_confirmed_at, phone_confirmed_at
   from auth.users
   where id = '<user_id from log>';
   ```

   The **`email`** string must match what Admin `generateLink` uses (see [`phone-local-identity.ts`](../../supabase/functions/_shared/phone-local-identity.ts) for digit variants). If **`email`** is null or unexpected, fix data or migrations before chasing Edge code.

2. **Edge logs** — filter by **function name `verify-otp`** and the **`request_id`** returned in the JSON body. Read **warn** lines in order: `generateLink` → `verifyOtp (email)` → `verifyOtp (magiclink)`. The final **`Returning user: could not establish session`** line should now include **`sessionDiag`** with the last errors.

3. **PostgREST schema cache** — if RPCs `auth_email_for_user_id` or `auth_user_id_for_phone_digits` fail with “function not found” / schema errors after `db push`, run in SQL Editor: `NOTIFY pgrst, 'reload schema';`

4. **Authentication → Providers → Email** — must be **enabled** for `signInWithPassword` / magic-link style flows used internally. “Confirm email” can stay off for `@phone.local`.

### Logs: searching “verify” vs phone OTP

Supabase **Logs** search matches the substring **“verify”** across many functions. That does **not** mean every hit ran during your SMS login.

| Function | Role |
|----------|------|
| **`verify-otp`** | Twilio SMS code + session for **phone sign-in** |
| **`email-verify-send`** / **`email-verify-confirm`** | Optional **Settings → Email verification** (Twilio email channel); requires an **already logged-in** user |
| **Forgot password** flows | Separate verification wording in logs |

To debug SMS OTP only: filter **function name** = `verify-otp` (or `function_id` for that deployment), not free-text “verify” alone.

### Guest feed / events “permission denied”

Anonymous reads for the home feed depend on **RLS + `GRANT SELECT` to `anon`** on `events`, `profiles`, `posts`, etc. The same migration **`20260328120000_anon_feed_grants_and_phone_in_auth.sql`** repairs grants and anon policies. Apply it on the new project (`supabase db push` or SQL Editor), then reload the app.

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
| `20260329120000_auth_user_id_for_phone_digits` | `verify-otp`: resolve `auth.users.id` by phone when `profiles.phone` mismatch |
| `20260329130000_auth_email_for_user_id` | `verify-otp`: read exact `auth.users.email` for `generateLink` (avoids wrong `digits@phone.local`) |

**How to apply:** SQL Editor → paste migration contents → Run, or `supabase db push` (if CLI linked).

**PostgREST schema cache:** If you get "Password reset not configured" after migration, run in SQL Editor: `NOTIFY pgrst, 'reload schema';`

### Seeds (manual SQL)

| File | When | Purpose |
|------|------|---------|
| [`auth_users_seed.sql`](auth_users_seed.sql) | **First** | Creates auth.users + identities for data_export user_ids. Required for dev login + data_export. |
| [`data_export.sql`](data_export.sql) | **After** auth_users_seed | Profiles, events, posts, rsvps, etc. |
| [`auth_users_fix_phone.sql`](auth_users_fix_phone.sql) | Only if old auth seed | If you ran auth_users_seed before it had the phone column, run once to populate phone/phone_confirmed_at. |

**Via migrations (CLI):** the same Lovable snapshot is applied as [`20260326120000_lovable_auth_users_seed.sql`](../../supabase/migrations/20260326120000_lovable_auth_users_seed.sql) then [`20260326120100_lovable_data_export.sql`](../../supabase/migrations/20260326120100_lovable_data_export.sql). Keep `docs/supabase/*.sql` in sync when you edit; regenerate the migration copies if you replace the export.

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

Full list of Edge Function secrets (Stripe, service role, etc.) is in [MIGRATION_AND_HOSTING.md](MIGRATION_AND_HOSTING.md).

---

## 6. Seed order (step by step)

1. In Supabase Dashboard → SQL Editor, paste and run `auth_users_seed.sql` (this folder).
2. Then paste and run `data_export.sql`.

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

- **Edge secrets are required:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` must be set under **Project Settings → Edge Functions → Secrets**; configuring Twilio only under **Auth → Phone** does not supply these to `send-otp` / `verify-otp`. See [TWILIO_EDGE_SECRETS.md](TWILIO_EDGE_SECRETS.md).
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

- [README.md](README.md) — Supabase docs hub (MCP, SQL files).
- [MIGRATION_AND_HOSTING.md](MIGRATION_AND_HOSTING.md) — Sydney hosting, region moves, full Edge secrets table.
