# Migration, hosting, and region moves

Single operational guide for **this repo’s Supabase project**: current **Sydney** hosting status, **future** region migration, optional legacy data, env/secrets/MCP, and troubleshooting.

**Current project** (see [`supabase/config.toml`](../../supabase/config.toml)):

- **Project ref / `project_id`:** `fxcosnsbaaktblmnvycv` (Sydney, `ap-southeast-2`).

---

## Sydney (current project) — status

Use this when the hosted DB is already on this project and `supabase/config.toml` matches.

| Area | Status |
|------|--------|
| **Schema** | Full migration chain applied with `supabase db push` (includes performance indexes, seed migrations, and Lovable snapshot [`20260326120000_lovable_auth_users_seed.sql`](../../supabase/migrations/20260326120000_lovable_auth_users_seed.sql) + [`20260326120100_lovable_data_export.sql`](../../supabase/migrations/20260326120100_lovable_data_export.sql)). |
| **Optional legacy `public` data** | Not loaded automatically. For rows not covered by the Lovable export, use [`scripts/region-migration/apply-public-data.sh`](../../scripts/region-migration/apply-public-data.sh) with `NEW_DB_URL` (Dashboard DB password). Resolve FK issues with `auth.users` after [Auth migration](https://supabase.com/docs/guides/platform/migrating-to-supabase). |
| **Storage** | Buckets + policies aligned; [`scripts/region-migration/05_storage_copy.sh`](../../scripts/region-migration/05_storage_copy.sh) used when copying from the old project. |
| **Storage URL rewrite** | [`20260327120000_rewrite_storage_urls_to_sydney.sql`](../../supabase/migrations/20260327120000_rewrite_storage_urls_to_sydney.sql) rewrites legacy `*.supabase.co` hosts in `profiles.avatar_url`, `organiser_profiles.avatar_url`, `events.cover_image`, `posts.image_url`, `event_media.url` to `https://fxcosnsbaaktblmnvycv.supabase.co`. |
| **Edge functions** | Deploy to this project: `supabase functions deploy … --project-ref fxcosnsbaaktblmnvycv`. Re-deploy after code changes. |
| **Secrets / Stripe** | Parity with Dashboard; Stripe webhook → `https://fxcosnsbaaktblmnvycv.supabase.co/functions/v1/stripe-webhook`. See **Edge Function secrets** below and [AUTH_AND_SEEDING.md](AUTH_AND_SEEDING.md) for auth-specific secrets. |

#### Storage migration has three separate steps

- **Bucket layout is expected:** `avatars`, `post-images`, `event-flyers`, `event-media`.
- **Object copy** moves the files. If this step is incomplete, rewritten URLs on the new project will still fail even when the old public URLs still load.
- If legacy URLs reference more than one old project ref, copy from the project that still serves the public objects, or from each source project in turn. Rewriting URLs alone is not enough.
- **DB URL rewrite** updates stored hosts in tables such as `profiles.avatar_url`; it does **not** copy objects.
- **Transformed / cached URLs** (`/storage/v1/render/image/public/...`) only optimize delivery for objects that already exist. They do not recover files that were never copied.

### Local Vite env (`.env.local` at repo root)

Vite merges `.env.local` over `.env`. Required for local dev against Sydney:

- `VITE_SUPABASE_URL` — `https://fxcosnsbaaktblmnvycv.supabase.co`
- `VITE_SUPABASE_PROJECT_ID` — `fxcosnsbaaktblmnvycv`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Dashboard → Settings → API (anon / publishable)
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe test/live publishable key

Restart `npm run dev` after changes.

### Supabase CLI

```bash
supabase login
supabase link --project-ref fxcosnsbaaktblmnvycv
```

Confirm `project_id` in `supabase/config.toml` matches the linked project.

### Edge Function secrets (reference)

Set in **Dashboard → Project Settings → Edge Functions → Secrets** (or `supabase secrets set --project-ref fxcosnsbaaktblmnvycv …`). Supabase usually injects `SUPABASE_URL`; confirm anon and service role keys match this project.

| Secret | Used by (examples) |
|--------|---------------------|
| `SUPABASE_ANON_KEY` | Most functions (JWT verify / user client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin paths, webhooks, cron |
| `SUPABASE_PUBLISHABLE_KEY` | `loyalty-award-points` |
| `STRIPE_SECRET_KEY` | Payments, Stripe Connect, webhooks, refunds |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` |
| `APP_ORIGIN` | Fallback frontend origin for redirects such as `stripe-connect-onboard` when the request `Origin` header is missing |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | OTP / forgot-password flows |
| `SEED_USER_PASSWORD` | `dev-login`, `verify-otp` fallback — use `seedplaceholder1` to match [`auth_users_seed.sql`](auth_users_seed.sql) |
| `CRON_SECRET` | `orders-expire-cleanup`; duplicate as a **GitHub Actions** repository secret if you use [`.github/workflows/orders-expire-cleanup.yml`](../../.github/workflows/orders-expire-cleanup.yml) |
| `GIPHY_API_KEY` | `gif-search` |
| `PAYMENTS_DISABLED` | Optional (`vip-payments-intent`, `vip-reserve`) |
| `CLOUD_TASKS_ENABLED` | Enable Cloud Tasks dispatch in `_shared/queue.ts` |
| `CLOUD_TASKS_PROJECT_ID` | GCP project ID for Cloud Tasks |
| `CLOUD_TASKS_LOCATION` | Cloud Tasks region (e.g. `australia-southeast1`) |
| `CLOUD_TASKS_QUEUE` | Cloud Tasks queue name |
| `CLOUD_TASKS_WORKER_URL` | Supabase Edge Function URL for `queue-worker` |
| `CLOUD_TASKS_SERVICE_ACCOUNT_JSON` | Service account JSON (raw or base64) |
| **Digital ID — Apple Wallet** (`wallet-apple-pass`) | `WALLET_APPLE_PASS_TYPE_IDENTIFIER`, `WALLET_APPLE_TEAM_IDENTIFIER`, `WALLET_APPLE_ORGANIZATION_NAME` (optional), `WALLET_APPLE_WWDR_PEM`, `WALLET_APPLE_SIGNER_CERT_PEM`, `WALLET_APPLE_SIGNER_KEY_PEM`, optional `WALLET_APPLE_SIGNER_KEY_PASSPHRASE` — see [Apple PassKit](https://developer.apple.com/documentation/walletpasses) cert guide |
| **Digital ID — Google Wallet** (`wallet-google-save`) | `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_GENERIC_CLASS_ID` (full class id `issuerId.suffix`), `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` (see below), optional `GOOGLE_WALLET_ALLOWED_ORIGIN` or `WALLET_WEB_ORIGIN` (JWT `origins`; defaults to request `Origin` if unset) |

If wallet secrets are missing, the app still works; the Edge Functions return **503** with `WALLET_APPLE_UNAVAILABLE` / `WALLET_GOOGLE_UNAVAILABLE` and the UI shows the error toast.

#### Google Wallet: which service account and key? (not Firebase / not queue)

The Edge Function [`wallet-google-save`](../../supabase/functions/wallet-google-save/index.ts) must **sign a JWT** using a Google service account **private key**. That is what the JSON key file is for.

1. **Do not reuse** `firebase-adminsdk-*` or `queue-mom` (or any unrelated SA JSON) for Wallet unless you deliberately grant those identities Wallet issuer access. Prefer a **dedicated** service account, e.g. `wallet-digital-id@<project>.iam.gserviceaccount.com`, so credentials stay least-privilege and rotatable independently of Firebase or Cloud Tasks.
2. In **Google Cloud Console** → **IAM & Admin** → **Service Accounts** → **Create service account** (name it e.g. `wallet-digital-id`). Then attach the IAM roles Google documents for **Google Wallet API** / your issuer (often done via the [Google Pay & Wallet Console](https://pay.google.com/business/console) when you add a service account as a developer).
3. Open that service account → **Keys** → **Add key** → **Create new key** → **JSON** → download. That file is a single JSON object (`type`, `project_id`, `private_key`, `client_email`, …).
4. In **Supabase** → **Project Settings** → **Edge Functions** → **Secrets**, create **`GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`** and paste the **entire JSON file contents** (multiline is fine). This is **only** stored server-side; it never goes in Vite `.env` or the browser.
5. Separately set **`GOOGLE_WALLET_ISSUER_ID`** and **`GOOGLE_WALLET_GENERIC_CLASS_ID`** from the Pay & Wallet Console (you must create a **Generic** class for Digital ID before saves succeed).

This secret is **different** from `CLOUD_TASKS_SERVICE_ACCOUNT_JSON` (queue worker) and different from Firebase Admin credentials.

#### Apple Wallet: certificates (Developer Program)

Signing **`.pkpass`** requires a **Pass Type ID** and certificates from an [**Apple Developer Program**](https://developer.apple.com/programs/) membership (annual fee). That membership is **not** only for App Store apps; PassKit / Wallet passes use the same program. Export PEMs into the `WALLET_APPLE_*` secrets listed above; nothing Apple-related belongs in the public web bundle.

### Stripe webhook

Endpoint: `https://fxcosnsbaaktblmnvycv.supabase.co/functions/v1/stripe-webhook` — copy signing secret into Supabase as required by [`stripe-webhook`](../../supabase/functions/stripe-webhook/index.ts). More context: [PAYMENT_FLOW.md](../PAYMENT_FLOW.md).

### GitHub Actions secrets

| Secret | Purpose |
|--------|---------|
| `SUPABASE_EXPECTED_PROJECT_ID` | Must match `project_id` in `supabase/config.toml` (CI guard via [`scripts/region-migration/check-project-ref.sh`](../../scripts/region-migration/check-project-ref.sh)) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | E2E / build |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Optional for checkout E2E |

### Cursor: Supabase MCP

Point the Supabase MCP at the **same** project ref as `supabase/config.toml`.

- **Hosted:** Cursor → Settings → Tools & MCP — URL like `https://mcp.supabase.com/mcp?project_ref=fxcosnsbaaktblmnvycv&read_only=true` (see [Supabase MCP docs](https://supabase.com/docs/guides/getting-started/mcp)).
- After changing URL/project, restart Cursor or reconnect MCP.

### Smoke test (manual)

Sign in, open feed, create/save an event, exercise checkout in test mode if applicable.

---

## Future: moving to a new Supabase region

Supabase does **not** allow changing the primary DB region in place. To host in another region, create a **new** project and migrate. This is a **manual** checklist (CLI + Dashboard). Expect **forced re-login** for all users after Auth migration.

### Prereqs

- Supabase CLI (`supabase login`), Postgres tools (`pg_dump`, `pg_restore`).
- Old and new project refs and DB URLs (Dashboard → Settings → Database).
- Disk space for dumps.

### Inputs (`scripts/region-migration/`)

Scripts can read `scripts/region-migration/env.local` (from [`env.sample`](../../scripts/region-migration/env.sample)).

| Variable | Purpose |
|----------|---------|
| `OLD_DB_URL`, `NEW_DB_URL` | Connection strings for dump/restore |
| `DUMP_DIR` | e.g. `./tmp/region-migration` |
| `OLD_PROJECT_REF`, `NEW_PROJECT_REF` | For storage copy |
| `STORAGE_BUCKETS` | Comma-separated bucket names |
| `DUMP_SCHEMAS` | Optional (default `public`) |
| `PG_RESTORE_JOBS` | Optional (default `1`) |

### Schema (alternative: repo as source of truth)

On an **empty** new project: `supabase link --project-ref <NEW_REF>` and `supabase db push` from the repo root to apply [`supabase/migrations/`](../../supabase/migrations/) in order. This does **not** copy legacy `public` rows from the old project; use [`apply-public-data.sh`](../../scripts/region-migration/apply-public-data.sh) if you need a data-only restore after schema.

**Scripted schema:**

```bash
cd scripts/region-migration
./01_dump_schema.sh
./03_restore_schema.sh
```

### Data

```bash
cd scripts/region-migration
./02_dump_data.sh
./04_restore_data.sh
```

### Auth users

Follow [Supabase migrating users](https://supabase.com/docs/guides/platform/migrating-to-supabase). Sessions and refresh tokens do not carry over.

### Storage

1. Recreate buckets and policies in the new project.
2. Copy objects: helper [`05_storage_copy.sh`](../../scripts/region-migration/05_storage_copy.sh), or CLI `supabase storage cp` between projects (re-link CLI with `supabase link` as needed). If historical URLs reference multiple old refs, repeat the copy for each source that still has live objects.
3. Run public spot checks on historical objects, especially `avatars`, before assuming image issues are a caching or transform problem.

If the DB stores full public URLs, run a one-off migration to rewrite hosts when the storage URL changes.

### Edge functions and app env

```bash
supabase secrets set --project-ref <NEW_REF> STRIPE_SECRET_KEY=... # etc.
supabase functions deploy --project-ref <NEW_REF>
```

**Vite:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` for the **new** project. Use `.env.local` at repo root for overrides.

**Stripe:** Dashboard webhooks → `https://<NEW_REF>.supabase.co/functions/v1/stripe-webhook`.

**Optional:** set `SUPABASE_EXPECTED_PROJECT_ID` in GitHub Actions to match `supabase/config.toml` after cutover.

### Cutover

Freeze writes on the old app during final delta sync if needed; point hosting to the new build; monitor logs and DB health.

---

## Troubleshooting: migration history drift

When remote migration history does not match local (e.g. changes applied via MCP/Dashboard), repair **specific** versions then push:

```bash
supabase migration repair --status reverted 20260318234458   # example: phantom migration
supabase migration repair --status applied 20260318190000
supabase migration repair --status applied 20260318200000
supabase db push
```

Do **not** mark a migration as `applied` if you still need `supabase db push` to run it for real.

---

## Troubleshooting: missing migrated images

- If an old public storage URL still returns `200` but the rewritten current-project URL returns `400` or `403`, the storage object copy is incomplete.
- Fix in this order: copy objects for `avatars`, `post-images`, `event-flyers`, and `event-media`; rerun [`20260327120000_rewrite_storage_urls_to_sydney.sql`](../../supabase/migrations/20260327120000_rewrite_storage_urls_to_sydney.sql); then smoke-test profile avatars and event media in the app.
- The frontend now prefers current-project avatar URLs but can fall back to the original public URL while copy gaps still exist. That fallback is a safety net, not a replacement for finishing the storage migration.
- **`initials.svg` / `avatar.jpeg` still `400` on `…/object/public/avatars/…`:** the row’s URL was rewritten to this project, but **no object exists** at that key. Either finish copying the `avatars` bucket from the source project (see [`05_storage_copy.sh`](../../scripts/region-migration/05_storage_copy.sh)), or set `profiles.avatar_url` / `organiser_profiles.avatar_url` to `NULL` for affected rows and re-upload or let signup/profile flows regenerate initials ([`supabase/functions/_shared/avatar.ts`](../../supabase/functions/_shared/avatar.ts)).
- **SVG:** the app does not request `/storage/v1/render/image/…` for `.svg` files (transforms are for raster images). Remaining failures are missing objects, not transform settings.

## Troubleshooting: `image-telemetry` returns 500

- The Edge Function [`image-telemetry`](../../supabase/functions/image-telemetry/index.ts) inserts into `public.image_telemetry_events` from migration [`20260324183000_image_platform_hardening.sql`](../../supabase/migrations/20260324183000_image_platform_hardening.sql). If that migration is not applied on the hosted project, inserts fail.
- Ensure **Edge Function secrets** include **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** for this project (same as other admin writers). Check Dashboard → Edge Functions → `image-telemetry` → Logs for the PostgREST error.

---

## Related docs

- [AUTH_AND_SEEDING.md](AUTH_AND_SEEDING.md) — dev login, OTP, seed SQL order, auth troubleshooting.
- [README.md](README.md) — hub index, MCP pointer.
- [PAYMENT_FLOW.md](../PAYMENT_FLOW.md) — Stripe sandbox and webhooks.
