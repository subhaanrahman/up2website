# Supabase — docs hub

**Current project:** `project_id` = `fxcosnsbaaktblmnvycv` (Sydney) in [`supabase/config.toml`](../../supabase/config.toml).

| Doc | Purpose |
|-----|---------|
| [MIGRATION_AND_HOSTING.md](MIGRATION_AND_HOSTING.md) | **Main ops guide:** Sydney status, env/secrets, Stripe webhook, GitHub Actions, MCP, future region migration, migration-history troubleshooting |
| [AUTH_AND_SEEDING.md](AUTH_AND_SEEDING.md) | Auth flows, dev login, seed SQL order (`auth_users_seed.sql` → `data_export.sql`), Twilio / `SEED_USER_PASSWORD` |
| [TWILIO_EDGE_SECRETS.md](TWILIO_EDGE_SECRETS.md) | **SMS OTP:** `TWILIO_*` Edge secrets (Auth UI alone is not enough) + redeploy `send-otp` / `verify-otp` |
| [CLOUD_TASKS.md](CLOUD_TASKS.md) | Cloud Tasks setup for MOM (queue worker, secrets, smoke test) |
| [CLOUD_TASKS_TEST_RUNBOOK.md](CLOUD_TASKS_TEST_RUNBOOK.md) | Comprehensive manual test: Phase 1 jobs + Stripe E2E |
| [FOLLOWUP_OBSERVABILITY_AND_CI.md](FOLLOWUP_OBSERVABILITY_AND_CI.md) | **Deferred** after MOM validation: Sentry DSN, GitHub E2E secrets, PostHog note |
| [MCP_SETUP.md](MCP_SETUP.md) | Cursor MCP short setup |
| [MIGRATIONS_CHANGELOG.md](MIGRATIONS_CHANGELOG.md) | Historical snapshot only; canonical history is `supabase/migrations/` + git |

**SQL seeds (run in Supabase SQL Editor):** `auth_users_seed.sql` first, then `data_export.sql` in this folder.
