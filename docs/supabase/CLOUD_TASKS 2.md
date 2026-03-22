# Cloud Tasks (MOM) - setup & ops

This repo uses **GCP Cloud Tasks** for async side-effects (Phase 1: Stripe webhook follow-ups). The queue worker is a Supabase Edge Function (`queue-worker`) that verifies **OIDC** tokens from Cloud Tasks.

---

## 1. GCP Console setup

1. **Enable API**: Cloud Tasks API in your GCP project.
2. **Create queue** (suggested region: `australia-southeast1`):
   - Name: choose e.g. `up2-mom`
   - Retry config: 3 attempts, exponential backoff (aligns with current behavior).
3. **Service account**:
   - Create a service account with role `cloudtasks.enqueuer`.
   - Download **JSON key** (store securely).

---

## 2. Supabase secrets

Set in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

- `CLOUD_TASKS_ENABLED=true`
- `CLOUD_TASKS_PROJECT_ID=<your-gcp-project-id>`
- `CLOUD_TASKS_LOCATION=australia-southeast1`
- `CLOUD_TASKS_QUEUE=<queue-name>`
- `CLOUD_TASKS_WORKER_URL=https://<project-ref>.supabase.co/functions/v1/queue-worker`
- `CLOUD_TASKS_SERVICE_ACCOUNT_JSON=<raw service account JSON>`
- `CLOUD_TASKS_AUTH_DELAY_SECONDS=15` (optional, default 0) — adds a small schedule delay for `auth.login` / `auth.signup` so tasks appear in Cloud Tasks UI

Notes:
- If storing JSON is painful, you can base64-encode it; the worker will decode either plain JSON or base64 JSON.
- The worker validates the OIDC token’s **audience** against `CLOUD_TASKS_WORKER_URL`.

---

## 3. Deploy the worker

```bash
supabase functions deploy --project-ref <PROJECT_REF>
```

---

## 3b. Queue shows zero tasks after login

Tasks are only **sent to GCP** when **`CLOUD_TASKS_ENABLED=true`** is set as a **secret for Edge Functions** (Dashboard → Project Settings → Edge Functions → Secrets), along with `CLOUD_TASKS_PROJECT_ID`, `CLOUD_TASKS_LOCATION`, `CLOUD_TASKS_QUEUE`, `CLOUD_TASKS_WORKER_URL`, and `CLOUD_TASKS_SERVICE_ACCOUNT_JSON`. If that flag is unset or false, `auth.login` / `auth.signup` jobs still run **inside** the `verify-otp` / `login` / `register` function (in-process); the GCP queue stays at zero by design. Check **Edge Function logs** for `MOM auth job runs in-process` vs successful enqueue / `Cloud Tasks enqueue failed`.

## 4. What uses Cloud Tasks (Phase 1)

From `stripe-webhook` (payment follow-ups):
- `tickets.issue`
- `rsvp.auto_mark_going`
- `loyalty.award_points`

**Auth observability** (same GCP queue when `CLOUD_TASKS_ENABLED=true`; handlers only **log** in `queue-worker` — useful to see tasks without Stripe):
- `auth.login` — enqueued from `verify-otp` (session issued) and `login` (password sign-in)
- `auth.signup` — enqueued from `register` when a new account + session is created

Other job types still run in‑process when not listed in [`supabase/functions/_shared/cloud-tasks.ts`](../../supabase/functions/_shared/cloud-tasks.ts) `CLOUD_TASK_TYPES`.

---

## 5. Smoke test

1. Trigger a Stripe test `payment_intent.succeeded`.
2. Confirm a task appears in Cloud Tasks.
3. Check Edge Function logs for `queue-worker`.
4. Verify tickets + RSVP + loyalty points were created.

For a **full manual test matrix** (per-job `gcloud` tasks, OIDC, Stripe E2E), see [CLOUD_TASKS_TEST_RUNBOOK.md](CLOUD_TASKS_TEST_RUNBOOK.md).

After validation, optional follow-ups (Sentry, CI E2E secrets): [FOLLOWUP_OBSERVABILITY_AND_CI.md](FOLLOWUP_OBSERVABILITY_AND_CI.md).

---

## 6. Why is the queue empty (0 tasks)?

That is **normal** until something actually **enqueues** work.

- **Tasks are short-lived.** Cloud Tasks shows pending + scheduled work. After the worker runs successfully, the task leaves the queue. Seeing **0** often means nothing is waiting right now, or nothing has been enqueued yet.
- **Console lag:** The “last minute” chart can lag behind real execution. Use `queue-worker` logs + enqueue logs (`Cloud Tasks enqueued`) as the source of truth.
- **Production path:** `stripe-webhook` enqueues payment jobs only when **`CLOUD_TASKS_ENABLED=true`** and the Supabase secrets in §2 are correct. **`auth.login` / `auth.signup`** are also enqueued from auth Edge Functions when the same flag is set — sign in or register to see tasks without Stripe.
- **Nothing to enqueue yet:** If you have not completed a payment that hits `stripe-webhook`, **and** you have not signed in/up with Cloud Tasks enabled, or webhook delivery failed, or enqueue is disabled, the queue may stay at 0.
- **Manual verification:** Create a one-off HTTP task with `gcloud` as in [CLOUD_TASKS_TEST_RUNBOOK.md](CLOUD_TASKS_TEST_RUNBOOK.md) — you should briefly see **1** task, then 0 after the worker processes it (or it fails and retries per queue policy).

If enqueue fails, check **Edge Function logs for `stripe-webhook`** (errors from the Cloud Tasks client or missing secrets), not only the queue depth in the console.
