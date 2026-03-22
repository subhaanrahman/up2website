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
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | OTP / forgot-password flows |
| `SEED_USER_PASSWORD` | `dev-login`, `verify-otp` fallback — use `seedplaceholder1` to match [`auth_users_seed.sql`](auth_users_seed.sql) |
| `CRON_SECRET` | `orders-expire-cleanup` |
| `TENOR_API_KEY` | `gif-search` |
| `PAYMENTS_DISABLED` | Optional (`vip-payments-intent`, `vip-reserve`) |
| `CLOUD_TASKS_ENABLED` | Enable Cloud Tasks dispatch in `_shared/queue.ts` |
| `CLOUD_TASKS_PROJECT_ID` | GCP project ID for Cloud Tasks |
| `CLOUD_TASKS_LOCATION` | Cloud Tasks region (e.g. `australia-southeast1`) |
| `CLOUD_TASKS_QUEUE` | Cloud Tasks queue name |
| `CLOUD_TASKS_WORKER_URL` | Supabase Edge Function URL for `queue-worker` |
| `CLOUD_TASKS_SERVICE_ACCOUNT_JSON` | Service account JSON (raw or base64) |

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
2. Copy objects: helper [`05_storage_copy.sh`](../../scripts/region-migration/05_storage_copy.sh), or CLI `supabase storage cp` between projects (re-link CLI with `supabase link` as needed).

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

## Related docs

- [AUTH_AND_SEEDING.md](AUTH_AND_SEEDING.md) — dev login, OTP, seed SQL order, auth troubleshooting.
- [README.md](README.md) — hub index, MCP pointer.
- [PAYMENT_FLOW.md](../PAYMENT_FLOW.md) — Stripe sandbox and webhooks.
