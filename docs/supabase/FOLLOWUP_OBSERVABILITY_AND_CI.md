# Follow-up: observability and CI (after Cloud Tasks validation)

**When:** After the message-oriented middleware (Cloud Tasks + `queue-worker`) is validated using [CLOUD_TASKS_TEST_RUNBOOK.md](CLOUD_TASKS_TEST_RUNBOOK.md).

These items are **not** required for Cloud Tasks itself; they harden production visibility and automated E2E.

---

## 1. Sentry (client errors)

**Status in code:** `@sentry/react` initializes when `VITE_SENTRY_DSN` is set ([`src/infrastructure/sentry.ts`](../../src/infrastructure/sentry.ts)); `ErrorBoundary` and `captureApiError` report when configured.

**To fully enable:**

1. Sign up at [sentry.io](https://sentry.io) (free tier available for small projects).
2. Create a **browser/React** project and copy the **DSN**.
3. Set **`VITE_SENTRY_DSN=<DSN>`** in:
   - Local: `.env.local`
   - Production/staging: hosting provider env vars
   - Optional: GitHub repository secret **`VITE_SENTRY_DSN`** — [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) passes it to **`npm run build`** and the E2E job so the bundle can report to Sentry when the secret is set.

The DSN is public in the client bundle by design; it is not a secret like a service role key.

---

## 2. GitHub Actions: always run Playwright E2E

**Current behavior:** [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs an `e2e` job after `ci`, but **skips** `npm run test:e2e` with exit 0 if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` are missing.

**To make E2E run on every push/PR to `main`:**

1. Add repository **Actions secrets** (same values as local `.env` for the Sydney project):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Optional: `VITE_SUPABASE_PROJECT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY` (checkout specs)
2. **Optional strict mode:** change the workflow so missing secrets **fail** the job instead of skipping (trade-off: forks without secrets no longer get a green skip).

**Note:** GitHub cannot run Playwright when Lovable “exports” unless that action **pushes to GitHub**. Treat **push/PR** as the automation trigger.

---

## 3. PostHog (optional)

**Not required** for reliability. Add when you need product analytics (funnels, retention, feature usage). Tracked as pending in [`docs/PLATFORM_TODOS.md`](../PLATFORM_TODOS.md) (Observability section).

---

## References

- Testing commands: [`docs/TESTING_GUIDE.md`](../TESTING_GUIDE.md)
- Platform checklist: [`docs/PLATFORM_TODOS.md`](../PLATFORM_TODOS.md)
