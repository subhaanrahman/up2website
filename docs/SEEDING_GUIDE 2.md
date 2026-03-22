# Seeding Guide — Restore data_export.sql

To run `docs/data_export.sql` in the Supabase SQL Editor, the `profiles` rows need their `user_id`s to exist in `auth.users` first. Otherwise you get:

```
error 23503: insert or update on table "profiles" violates foreign key constraint
"profiles_user_id_fkey" — key (user_id) is not present in table "users"
```

---

## Prerequisites (auth_users_seed vs password_reset_tokens)

These are **separate** steps. Run only what you need:

| Feature | Requires | Does NOT use |
|---------|----------|--------------|
| **Dev login** (Dylan/Haan, curl dev-login) | `auth_users_seed.sql` + `SEED_USER_PASSWORD` secret | `password_reset_tokens` |
| **Forgot password** (OTP reset flow) | `password_reset_tokens` migration | `auth_users_seed` for the reset flow |
| **Data export** (profiles, events) | `auth_users_seed.sql` first, then `data_export.sql` | — |

See [docs/AUTH_SETUP_CHECKLIST.md](AUTH_SETUP_CHECKLIST.md) for the full setup (migrations, functions, secrets).

---

## How to apply migrations

**Option A (Supabase Dashboard):**

1. Open **Supabase Dashboard → SQL Editor**
2. Copy the contents of the migration file (e.g. `supabase/migrations/20260318120000_password_reset_tokens.sql`)
3. Paste into the SQL Editor and click **Run**

**Option B (Supabase CLI):**

```bash
supabase link   # link to your project
supabase db push
```

**Migrations to apply (in order when needed):**

| Migration | Purpose |
|------------|---------|
| `password_reset_tokens` | Creates table for forgot-password flow. Required for OTP reset. |
| `auth_users_seed.sql` (manual) | Inserts auth.users for Dylan/Haan etc. Required for dev login + data_export. Run in SQL Editor. |
| `data_export.sql` (manual) | Profiles, events, posts, etc. Run **after** auth_users_seed. |

---

## Steps (in order)

### 1. Run auth seed (creates auth.users + auth.identities)

In **Supabase Dashboard → SQL Editor**:

1. Open `docs/auth_users_seed.sql`
2. Paste the contents into the SQL Editor
3. Run it

### 2. Run data export

1. Open `docs/data_export.sql`
2. Paste the contents into the SQL Editor
3. Run it

---

## If you already ran the old auth seed (before phone column)

If you ran `auth_users_seed.sql` before it included the `phone` column, returning users may be sent to the register step instead of logging in. Run `docs/auth_users_fix_phone.sql` in the SQL Editor once to populate `phone` and `phone_confirmed_at` on existing auth.users rows.

---

## What the auth seed does

- Inserts rows into `auth.users` for all 28 user IDs in the export (including `phone` and `phone_confirmed_at`)
- Uses phone numbers from profiles when available (Dylan, Haan, Kai, Tino, Jake, Insaaf, A J, Matt)
- Uses placeholder phones (`+27000000001` … `+27000000020`) for users without phones in the export
- Inserts matching rows into `auth.identities` with `provider='phone'`
- Uses internal email format `{digits}@phone.local` to match the register flow
- Password `seedplaceholder1` (not used in prod; only for schema compatibility)
- Safe to run more than once (`ON CONFLICT DO NOTHING`)

---

## Logging in after seeding

**Option A — dev-login (recommended):** Call the `dev-login` edge function with a `user_id` JSON body:

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/dev-login \
  -H "Content-Type: application/json" \
  -d '{"user_id":"1eafb563-071a-45c6-a82e-79b460b3a851"}'
```

Returns `access_token` and `refresh_token` — use those in your app. Dylan's `user_id` is `1eafb563-071a-45c6-a82e-79b460b3a851`.

**Option B — Phone + password:** The seed sets password `seedplaceholder1` for all users. Use `signInWithPassword` with phone (e.g. `61405826420`) and that password.

**Option C — Phone + OTP (returning users):** For OTP login, the `verify-otp` function normally uses a magic link. Seeded users can hit "Database error loading user" from the Admin API. Set the **SEED_USER_PASSWORD** secret so verify-otp can fall back to `signInWithPassword`:

```
supabase secrets set SEED_USER_PASSWORD=seedplaceholder1
```

Or in Dashboard: Project Settings → Edge Functions → Secrets → add `SEED_USER_PASSWORD` = `seedplaceholder1`.

---

## Files

| File | Purpose |
|------|---------|
| `docs/auth_users_seed.sql` | Creates auth.users + identities for data_export user_ids. Run first. |
| `docs/auth_users_fix_phone.sql` | Fixes existing auth.users (adds phone) if you ran the old seed. Run once. |
| `docs/data_export.sql` | Lovable export — profiles, events, posts, rsvps, etc. Run second. |
| `supabase/seed.sql` | Legacy email-based seed (seed-host-1@example.com). Not used for data_export. |
