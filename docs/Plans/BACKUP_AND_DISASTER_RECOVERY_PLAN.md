# Backup And Disaster Recovery Plan

> Last updated: 2026-03-23
> Scope: production-first. This repo currently has no true staging environment, so this runbook assumes the Sydney production Supabase project is the primary recovery target.

## 1. Recovery Targets And Assumptions

- Recovery posture: **Lean Prod**
- Target **RPO**: `<= 24 hours`
- Target **RTO**: `<= 8 hours`
- Backup posture: **Hybrid** — vendor-native backups plus independent off-platform exports
- Current primary backend: Supabase project `fxcosnsbaaktblmnvycv` in Sydney (`ap-southeast-2`)
- Current frontend runtime: containerized static build from [`../../Dockerfile`](../../Dockerfile), deployed via the team’s Google Cloud Run path
- Lovable may still remain connected through GitHub sync, but it is **not** the active production hosting or primary disaster recovery target
- This document does **not** store any secret values; only locations, owners, and restore steps
- Existing repo scripts and migrations are the v1 restore mechanism; do not invent one-off manual SQL unless the standard restore path fails

### Incident Severity

| Severity | Meaning | Examples |
|---|---|---|
| `P1` | Full outage, data loss, or unsafe state | Supabase unavailable, production data corruption, payments drift, secret compromise |
| `P2` | Major degradation in a core flow | Twilio OTP outage, storage loss, Stripe webhook backlog |
| `P3` | Limited degradation or recoverable config issue | Optional integration failure, partial observability loss |

## 2. Critical Asset Inventory

### Tier 0

- **GitHub source of truth**: React app, Supabase edge functions, migrations, scripts, CI workflow, docs
- **Supabase runtime**: PostgreSQL data, `auth.users`, storage buckets, edge-function deployment target, secrets
- **Payments**: Stripe API keys, webhook endpoint, webhook signing secret, payment event audit trail
- **Secrets**: Supabase edge secrets, local/hosted env vars, CI secrets, provider credentials

### Tier 1

- **Frontend runtime**: Google Cloud Run service, service URL, region, service account, domain mapping, and deploy config
- **Twilio OTP**: Verify service and `send-otp` / `verify-otp` / forgot-password flows
- **Async jobs**: `queue-worker`, Cloud Tasks queue, worker URL, OIDC/service-account config when `CLOUD_TASKS_ENABLED=true`
- **GitHub Actions**: repository secrets used for build, E2E, and Supabase project guards

### Tier 2

- **Observability**: optional Sentry DSN and issue history
- **Optional integrations**: Apple Wallet, Google Wallet, Spotify client ID, GIPHY API key
- **Local recovery artifacts**: seed SQL, export snapshots, region-migration dump files

## 3. Backup Matrix

| Asset | Source Of Truth | Backup Method | Cadence | Retention | Restore Path |
|---|---|---|---|---|---|
| GitHub repo | GitHub repository on `main` | Standard Git history plus a weekly mirror/export to a second controlled location | Continuous via Git; weekly mirror | Git history plus weekly copies retained per org policy | Re-clone repo, verify `supabase/config.toml`, restore mirrored repo if GitHub is unavailable |
| Frontend runtime (Google Cloud Run service + container deploy config) | GitHub repo, [`../../Dockerfile`](../../Dockerfile), and GCP Cloud Run service configuration | Keep an out-of-repo deployment inventory for Cloud Run service name, URL, region, service account, domain mapping, image/tag strategy, and required env vars; rebuildable from repo at any time | Update on every deploy/config change | 12 months of config history | Build the frontend container from the repo, redeploy to Cloud Run, restore env vars/service account/domain mapping, and validate the active public URL |
| Supabase database (`public` schema and app data) | Hosted Postgres in project `fxcosnsbaaktblmnvycv` | Supabase managed backups/PITR if available, plus nightly off-platform logical data export and weekly schema export using the existing `scripts/region-migration/01_dump_schema.sh`, `scripts/region-migration/02_dump_data.sh`, `scripts/region-migration/03_restore_schema.sh`, and `scripts/region-migration/04_restore_data.sh` flow | PITR/managed per provider; nightly data dump; weekly schema dump | Daily copies for 30 days; monthly archives for 12 months | Recover from PITR when possible; otherwise rebuild schema with [`supabase db push`](../../supabase/migrations) or schema restore, then restore data dump and run smoke checks |
| Supabase Auth users | Supabase Auth control plane (`auth.users`) | Provider-native backup plus an explicit documented auth export/migration path; treat this as a critical gap until it is tested and automated | Verify quarterly; re-check before region moves or major auth changes | Keep procedure history for 12 months; provider retention as available | Follow the Supabase auth migration path documented in [`../supabase/MIGRATION_AND_HOSTING.md`](../supabase/MIGRATION_AND_HOSTING.md); expect forced re-login because sessions and refresh tokens do not carry over |
| Supabase storage buckets (`avatars`, `post-images`, `event-flyers`, `event-media`) | Supabase Storage in the active project | Daily off-platform object copy using the existing [`../../scripts/region-migration/05_storage_copy.sh`](../../scripts/region-migration/05_storage_copy.sh) approach or equivalent bucket sync | Daily and before migrations/cutovers | 30 days | Recreate buckets/policies via migrations, copy objects back, and run storage URL rewrite migration if the project host changes |
| Secrets and configuration inventory | Supabase Edge Function secrets, Cloud Run env/deploy config, GitHub Actions secrets, provider dashboards | Maintain a secure out-of-repo inventory recording secret name, owner, purpose, location, last rotation date, and dependent systems; update immediately after every change | Weekly and on every credential/config change | Latest snapshot plus 12 months of change history | Repopulate a rebuilt project, Cloud Run service, and CI from the secure inventory; never restore from repo files |
| Third-party control-plane settings | Stripe, Twilio, Google Cloud Run, GCP Cloud Tasks, GitHub, optional wallet providers | Keep an out-of-repo settings inventory covering Stripe webhook endpoint/owner, Twilio Verify SID, Cloud Run service URL/region/service account/domain mapping, Cloud Tasks queue/location/worker URL/service-account email, optional Apple/Google Wallet config, and GitHub Actions secret names | Weekly and on every settings change | 12 months | Recreate provider settings before reopening writes, then run targeted smoke tests for each integration |

## 4. Disaster Recovery Runbook

1. **Declare the incident**
   - Open an incident log with start time, severity, affected systems, and incident commander.
   - Assign at minimum: commander, comms owner, and recovery operator.

2. **Freeze risky writes**
   - Set `PAYMENTS_DISABLED=true` for `orders-reserve`, `payments-intent`, `vip-reserve`, and `vip-payments-intent`.
   - Pause `orders-expire-cleanup` scheduling and any other automated jobs that could mutate state during recovery.
   - If Cloud Tasks is enabled, pause the GCP queue or disable queue dispatch before redeploying affected functions.
   - Preserve Supabase logs, Stripe event history, GitHub Actions logs, and provider incident evidence before changing state.

3. **Confirm scope and last known good backup**
   - Identify whether the fault is data corruption, project loss, storage loss, auth loss, or integration drift.
   - Record the last known good DB dump/PITR point, storage copy, and config inventory snapshot.
   - Decide whether recovery should happen in-place or in a newly provisioned project.

4. **Rebuild the platform base**
   - Recreate or validate the Supabase target project and link the CLI with `supabase link --project-ref <ref>`.
   - Rebuild the frontend container from [`../../Dockerfile`](../../Dockerfile) and restore the active Google Cloud Run deployment settings from the external inventory.
   - Re-apply schema and policies using `supabase db push` from repo migrations, or restore schema from the dump scripts when that is the safer path.
   - Recreate storage buckets and policies through the migration chain.
   - Deploy edge functions to the correct project and restore required secrets.
   - Restore frontend host and CI env configuration: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, plus any optional Sentry, wallet, Spotify, or GIPHY (Edge) vars in use.

5. **Restore data in order**
   - Restore Postgres application data from the selected PITR point or logical dump.
   - Restore Supabase Auth users using the documented auth migration/export path.
   - Restore storage objects for `avatars`, `post-images`, `event-flyers`, and `event-media`.
   - Reconnect provider settings: Stripe webhook, Twilio Verify secrets, Cloud Run service/domain settings, Cloud Tasks worker URL/OIDC, optional wallet config, and GitHub Actions secrets.
   - Reconcile payments, tickets, and refunds before reopening checkouts.

6. **Run smoke checks before reopening traffic**
   - Keep writes limited until the checks in [Section 5](#5-go-no-go-checks) pass.
   - If auth or payment recovery is incomplete, stay in degraded mode rather than reopening everything.

7. **Re-enable traffic and capture follow-up work**
   - Re-enable payments only after order, ticket, and webhook state is verified.
   - Resume cron/queue processing in a controlled order.
   - Record final recovery time, any data-loss window, and follow-up actions in the incident log.

## 5. Go/No-Go Checks

| Check | Pass Condition |
|---|---|
| `health` edge function | [`../../supabase/functions/health/index.ts`](../../supabase/functions/health/index.ts) returns `{ ok: true }` from the restored project |
| Auth | Phone OTP or the agreed auth path works against the restored project; no project-ref mismatch errors |
| Frontend runtime | Cloud Run service is reachable on the active public URL and serves the current build successfully |
| Core reads | Home feed, event detail, profile, and saved events load successfully |
| Core writes | Create/update event, RSVP, and profile/settings write paths succeed |
| Storage | Avatars, post images, event flyers, and event media resolve correctly |
| Payments | Stripe webhook endpoint is correct, webhook signing secret is confirmed, and ticket issuance/reconciliation is clean before enabling new checkouts |
| Jobs | If Cloud Tasks is enabled, `queue-worker` accepts valid jobs and no retry storm is present |
| Logs | No sustained 5xx errors or auth mismatch failures in Supabase edge logs after restore |

**Go only if all Tier 0 checks pass, or the commander explicitly approves a documented degraded mode.**

## 6. Scenario Playbooks

### Accidental Postgres Data Deletion Or Corruption

- Freeze writes to the affected flow immediately.
- Prefer PITR to a known-good timestamp if the blast radius is broad.
- If the blast radius is narrow, restore the last logical dump into a scratch environment and selectively copy back validated rows.
- Validate row counts and high-risk tables first: `orders`, `tickets`, `refunds`, `rsvps`, `events`, `profiles`, `notifications`.

### Supabase Project Loss Or Forced Region Move

- Provision a new Supabase project.
- Rebuild schema and policies from repo migrations or schema dump.
- Restore `public` data, migrate auth users, and copy storage objects.
- Reapply secrets, redeploy functions, restore the Cloud Run frontend deployment/env, and repoint Stripe webhooks to the new `{SUPABASE_URL}/functions/v1/stripe-webhook`.
- Expect user re-authentication after auth migration.

### Storage Bucket Loss Or Object Corruption

- Confirm which buckets are affected: `avatars`, `post-images`, `event-flyers`, `event-media`.
- Recreate buckets/policies via migrations and restore objects from the last daily copy.
- If the Supabase host changes, run the storage URL rewrite migration before reopening traffic.
- Validate profile avatars, feed images, event cover art, and event gallery media in the app.

### Stripe Webhook Failure Or Order/Ticket Drift

- Keep `PAYMENTS_DISABLED` on while reconciliation is in progress if new checkouts would make drift worse.
- Compare Stripe events with `payment_events`, `orders`, `tickets`, and `refunds`.
- Replay failed webhooks from Stripe when safe; idempotency should prevent double-processing.
- Manually repair confirmed orders missing tickets before re-enabling checkout.

### Twilio Outage Affecting OTP Login

- Declare a degraded auth incident rather than a full platform outage unless existing sessions are also failing.
- Confirm the issue is provider-side, not missing `TWILIO_*` secrets or broken deploy state.
- Preserve existing sessions and avoid unnecessary sign-outs while OTP is degraded.
- Reopen normal auth only after `send-otp`, `verify-otp`, and forgot-password checks succeed again.

### Secret Compromise Or Suspected Credential Leak

- Rotate the affected credential at the provider first, then update Supabase, Cloud Run, and GitHub as needed.
- Redeploy affected edge functions and validate webhook/auth integrations immediately afterward.
- Review Stripe webhook changes, Twilio usage, Supabase admin activity, and GitHub Actions history for unauthorized activity.
- If a Supabase auth- or API-related credential is impacted, assess whether forced sign-out or key rotation messaging is required.

## 7. Next Steps

1. Verify or enable Supabase PITR and confirm the actual retention window.
2. Automate nightly DB dumps and daily storage copies to an off-platform location.
3. Add and test a formal Supabase Auth user backup/recovery procedure.
4. Run quarterly restore drills and one full annual DR exercise.
5. Add a true staging environment so recovery steps can be tested before production use.
6. Improve observability, dead-letter handling, and alerting around queue and webhook recovery.

## 8. References

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- [`../DATABASE_ARCHITECTURE.md`](../DATABASE_ARCHITECTURE.md)
- [`../PAYMENT_FLOW.md`](../PAYMENT_FLOW.md)
- [`../TESTING_GUIDE.md`](../TESTING_GUIDE.md)
- [`../supabase/MIGRATION_AND_HOSTING.md`](../supabase/MIGRATION_AND_HOSTING.md)
- [`../supabase/AUTH_AND_SEEDING.md`](../supabase/AUTH_AND_SEEDING.md)
- [`../supabase/CLOUD_TASKS.md`](../supabase/CLOUD_TASKS.md)
- [`../../scripts/region-migration/env.sample`](../../scripts/region-migration/env.sample)
