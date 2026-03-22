# Cloud Tasks (MOM) — comprehensive test runbook

**Payment jobs** (from `stripe-webhook` when Cloud Tasks is enabled): `tickets.issue`, `rsvp.auto_mark_going`, `loyalty.award_points`.

**Auth observability jobs** (from `verify-otp`, `login`, `register` when enabled): `auth.login`, `auth.signup` — handlers only log; useful to see the queue without Stripe.

The worker is [`supabase/functions/queue-worker/index.ts`](../../supabase/functions/queue-worker/index.ts); handlers live in [`supabase/functions/_shared/job-handlers.ts`](../../supabase/functions/_shared/job-handlers.ts).

Complete [CLOUD_TASKS.md](CLOUD_TASKS.md) setup first.

**After validation:** [FOLLOWUP_OBSERVABILITY_AND_CI.md](FOLLOWUP_OBSERVABILITY_AND_CI.md) (Sentry, CI E2E secrets).

---

## 0) Variables (fill once)

| Symbol | Example | Where to get it |
|--------|---------|-----------------|
| `PROJECT_REF` | `fxcosnsbaaktblmnvycv` | [`supabase/config.toml`](../../supabase/config.toml) `project_id` |
| `WORKER_URL` | `https://fxcosnsbaaktblmnvycv.supabase.co/functions/v1/queue-worker` | Must match secret `CLOUD_TASKS_WORKER_URL` exactly |
| `QUEUE_NAME` | `up2-mom` | GCP Console → Cloud Tasks → Queues (same as `CLOUD_TASKS_QUEUE`) |
| `LOCATION` | `australia-southeast1` | Same as `CLOUD_TASKS_LOCATION` |
| `GCP_PROJECT` | your GCP project id | Same as `CLOUD_TASKS_PROJECT_ID` |
| `SA_EMAIL` | `something@...gserviceaccount.com` | Service account used for **OIDC** (JSON key’s `client_email`) |
| `AUTH_DELAY` | `15` | Optional `CLOUD_TASKS_AUTH_DELAY_SECONDS` for auth visibility |

Shell helpers (optional):

```bash
export PROJECT_REF=fxcosnsbaaktblmnvycv
export WORKER_URL="https://${PROJECT_REF}.supabase.co/functions/v1/queue-worker"
export LOCATION=australia-southeast1
export QUEUE_NAME=up2-mom   # your queue name
export GCP_PROJECT=your-gcp-project-id
export SA_EMAIL=cloud-tasks-invoker@your-gcp-project.iam.gserviceaccount.com
export AUTH_DELAY=15
gcloud config set project "$GCP_PROJECT"
```

---

## Prerequisites

1. **GCP:** Cloud Tasks API enabled; queue exists in `LOCATION`; service account can **enqueue** (`roles/cloudtasks.enqueuer`) and Cloud Tasks can **invoke** the worker with OIDC (see GCP IAM for the task invoker / OIDC setup you use with `gcloud tasks create-http-task`).
2. **Supabase secrets** (Dashboard → Edge Functions → Secrets): `CLOUD_TASKS_ENABLED`, `CLOUD_TASKS_PROJECT_ID`, `CLOUD_TASKS_LOCATION`, `CLOUD_TASKS_QUEUE`, `CLOUD_TASKS_WORKER_URL`, `CLOUD_TASKS_SERVICE_ACCOUNT_JSON` — see [CLOUD_TASKS.md](CLOUD_TASKS.md).
   - Optional: `CLOUD_TASKS_AUTH_DELAY_SECONDS=$AUTH_DELAY` to keep auth tasks visible for ~15s.
3. **Deploy worker:**

   ```bash
   supabase functions deploy queue-worker --project-ref "$PROJECT_REF"
   ```

4. **Confirm deployment:** Bulk deploys can omit `queue-worker` if it was never pushed. If `curl` returns `404` / `NOT_FOUND`, deploy explicitly and verify:

   ```bash
   supabase functions list --project-ref "$PROJECT_REF" | grep queue-worker || echo "queue-worker missing — deploy it"
   ```

---

## 1) Worker auth sanity check

`queue-worker` only accepts **POST** and requires a **Bearer** OIDC token (Cloud Tasks adds this). A plain **GET** returns **405 Method Not allowed**, not 401.

**Expect 401 — unauthenticated POST:**

```bash
curl -i -X POST "$WORKER_URL" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** `401` with body mentioning Unauthorized (no `Authorization: Bearer`).

**Expect 405 — wrong method:**

```bash
curl -i "$WORKER_URL"
```

**Expected:** `405 Method not allowed`.

**Note on UI visibility:** Cloud Tasks “last minute” metrics can lag. If you set `CLOUD_TASKS_AUTH_DELAY_SECONDS`, you should see auth tasks in the queue for the delay window, and `queue-worker` logs will confirm execution.

---

## 2) Pick real IDs from the database

Run in **Supabase Dashboard → SQL Editor** (or `psql`).

**`tickets.issue`** needs a row in `orders` (FK on `tickets.order_id`). Pick an order that **does not already have** the expected number of ticket rows if you want a clean insert test, or use a dedicated test order.

```sql
-- Recent confirmed orders (good candidates if tickets not yet duplicated)
SELECT o.id AS order_id, o.event_id, o.user_id, o.ticket_tier_id, o.quantity, o.status
FROM orders o
LEFT JOIN (
  SELECT order_id, count(*) AS n FROM tickets GROUP BY order_id
) t ON t.order_id = o.id
WHERE o.status = 'confirmed'
ORDER BY o.confirmed_at DESC NULLS LAST
LIMIT 10;
```

If none exist, complete a **Stripe test purchase** first (section 5) or create a test order consistent with your app rules.

**`rsvp.auto_mark_going`** needs a valid `user_id` and `event_id` (from `events`).

```sql
SELECT id, title FROM events WHERE status = 'published' LIMIT 5;
SELECT user_id FROM profiles LIMIT 5;
```

**`loyalty.award_points`** needs a valid `user_id`. `action_type` must exist in the handler map or **zero points** are applied and **nothing is written** (see below).

---

## 3) Job envelope (reference)

The worker expects JSON:

```json
{
  "job": {
    "id": "unique-string-per-task",
    "type": "<JobType>",
    "payload": { },
    "createdAt": "2026-03-20T12:00:00Z",
    "maxAttempts": 3
  }
}
```

`type` must be one of the registered types (see `JOB_TYPES` in `queue-worker/index.ts`). Payload shapes match [`supabase/functions/_shared/queue.ts`](../../supabase/functions/_shared/queue.ts).

---

## 4) Test `tickets.issue` via Cloud Tasks

**Payload** (`TicketsIssuePayload`): `order_id`, `event_id`, `ticket_tier_id` (nullable), `user_id`, `quantity` (integer ≥ 1).

**Verify in SQL:**

```sql
SELECT id, order_id, event_id, user_id, status FROM tickets WHERE order_id = '<ORDER_ID>' ORDER BY created_at DESC;
```

**`gcloud`** (replace placeholders; `--project` if needed). Default HTTP method is POST; set explicitly with `--method=POST`.

```bash
CREATED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
gcloud tasks create-http-task \
  --project="$GCP_PROJECT" \
  --queue="$QUEUE_NAME" \
  --location="$LOCATION" \
  --url="$WORKER_URL" \
  --method=POST \
  --oidc-service-account-email="$SA_EMAIL" \
  --oidc-token-audience="$WORKER_URL" \
  --header="Content-Type: application/json" \
  --body-content="{\"job\":{\"id\":\"job_test_tickets_$(date +%s)\",\"type\":\"tickets.issue\",\"payload\":{\"order_id\":\"<ORDER_ID>\",\"event_id\":\"<EVENT_ID>\",\"ticket_tier_id\":null,\"user_id\":\"<USER_ID>\",\"quantity\":1},\"createdAt\":\"$CREATED\",\"maxAttempts\":3}}"
```

If your shell mangles JSON, put the body in `task-tickets.json` and use **`--body-file=task-tickets.json`** instead of `--body-content` (do not pass both).

**Failure modes:** duplicate `order_id` + quantity mismatch vs existing rows; FK violation if `order_id` is not in `orders`.

---

## 5) Test `rsvp.auto_mark_going`

**Payload** (`AutoRsvpPayload`): `user_id`, `event_id`, `status` (e.g. `going` — same as [`stripe-webhook`](../../supabase/functions/stripe-webhook/index.ts)).

```bash
CREATED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
gcloud tasks create-http-task \
  --project="$GCP_PROJECT" \
  --queue="$QUEUE_NAME" \
  --location="$LOCATION" \
  --url="$WORKER_URL" \
  --method=POST \
  --oidc-service-account-email="$SA_EMAIL" \
  --oidc-token-audience="$WORKER_URL" \
  --header="Content-Type: application/json" \
  --body-content="{\"job\":{\"id\":\"job_test_rsvp_$(date +%s)\",\"type\":\"rsvp.auto_mark_going\",\"payload\":{\"user_id\":\"<USER_ID>\",\"event_id\":\"<EVENT_ID>\",\"status\":\"going\"},\"createdAt\":\"$CREATED\",\"maxAttempts\":3}}"
```

**Verify:**

```sql
SELECT * FROM rsvps WHERE event_id = '<EVENT_ID>' AND user_id = '<USER_ID>';
```

---

## 6) Test `loyalty.award_points`

**Payload** (`LoyaltyAwardPayload`): `user_id`, `action_type`, optional `description`.

Points are only awarded if `action_type` is in the internal map (see [`job-handlers.ts`](../../supabase/functions/_shared/job-handlers.ts)): e.g. `buy_ticket` → 50 points. If `action_type` is unknown, **points = 0** and the handler **returns without** inserting `point_transactions` — use `buy_ticket` for a visible test.

```bash
CREATED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
gcloud tasks create-http-task \
  --project="$GCP_PROJECT" \
  --queue="$QUEUE_NAME" \
  --location="$LOCATION" \
  --url="$WORKER_URL" \
  --method=POST \
  --oidc-service-account-email="$SA_EMAIL" \
  --oidc-token-audience="$WORKER_URL" \
  --header="Content-Type: application/json" \
  --body-content="{\"job\":{\"id\":\"job_test_loyalty_$(date +%s)\",\"type\":\"loyalty.award_points\",\"payload\":{\"user_id\":\"<USER_ID>\",\"action_type\":\"buy_ticket\",\"description\":\"Cloud Tasks test\"},\"createdAt\":\"$CREATED\",\"maxAttempts\":3}}"
```

**Verify:**

```sql
SELECT total_points, current_rank FROM user_points WHERE user_id = '<USER_ID>';
SELECT * FROM point_transactions WHERE user_id = '<USER_ID>' ORDER BY created_at DESC LIMIT 5;
```

If the user crosses a rank threshold, `loyalty.rank_up_voucher` may also be enqueued (separate job).

---

## 6b) Test `auth.login` / `auth.signup` (observability)

Payload (`AuthMomPayload`): `user_id`, `edge_request_id` (correlates with Edge logs).

Handlers **only emit structured logs** in `queue-worker` — no required DB verification.

**Automatic path:** With `CLOUD_TASKS_ENABLED=true`, sign in via OTP (`verify-otp` / `login`) or complete registration (`register`); GCP should show a task per successful session.

**Manual `gcloud`:**

```bash
CREATED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
gcloud tasks create-http-task \
  --project="$GCP_PROJECT" \
  --queue="$QUEUE_NAME" \
  --location="$LOCATION" \
  --url="$WORKER_URL" \
  --method=POST \
  --oidc-service-account-email="$SA_EMAIL" \
  --oidc-token-audience="$WORKER_URL" \
  --header="Content-Type: application/json" \
  --body-content="{\"job\":{\"id\":\"job_test_auth_login_$(date +%s)\",\"type\":\"auth.login\",\"payload\":{\"user_id\":\"<USER_ID>\",\"edge_request_id\":\"manual-gcloud-test\"},\"createdAt\":\"$CREATED\",\"maxAttempts\":3}}"
```

Swap `auth.login` for `auth.signup` to exercise the other handler.

**Verify:** Supabase → Edge Functions → `queue-worker` logs should show `MOM auth.login` or `MOM auth.signup` with `user_id`.

---

## 7) End-to-end Stripe path

Goal: real `payment_intent.succeeded` → `stripe-webhook` confirms order → **enqueue** three Phase 1 jobs → Cloud Tasks → `queue-worker` → DB side-effects.

**Steps:**

1. **Stripe Dashboard:** Test mode; webhook endpoint `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook` with signing secret matching Edge secret `STRIPE_WEBHOOK_SECRET`.
2. **App:** Log in as a test user; reserve and pay for a ticket using a [Stripe test card](https://stripe.com/docs/testing).
3. **Stripe:** Webhook delivery log shows `payment_intent.succeeded` (or equivalent path your handler uses) with **2xx** from Supabase.
4. **GCP:** Cloud Tasks → queue → **Tasks** — new task(s) toward `queue-worker` (timing depends on `enqueue` / Cloud Tasks client).
5. **Supabase:** Edge Functions → **Logs** → `stripe-webhook` then `queue-worker` — no 401/500 loops.
6. **DB:** `orders.status` = `confirmed`; rows in `tickets`, `rsvps` (going), `user_points` / `point_transactions` as applicable.

**Where to watch logs**

| Place | What |
|-------|------|
| Supabase Dashboard → Edge Functions → `stripe-webhook` | Order confirmed, enqueue calls |
| Supabase Dashboard → Edge Functions → `queue-worker` | OIDC OK, `processJob`, handler success/failure |
| GCP Console → Cloud Tasks → Queue → Tasks | Task name, schedule, last attempt |
| GCP Logging (optional) | `gcloud` / Cloud Tasks audit if enabled |

---

## 8) Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `404` / `Requested function was not found` | **`queue-worker` not deployed** to this project — run `supabase functions deploy queue-worker --project-ref …` and re-check `functions list` |
| `401` from worker | Missing/wrong `Authorization: Bearer`; OIDC `aud` ≠ `CLOUD_TASKS_WORKER_URL`; email ≠ SA in `CLOUD_TASKS_SERVICE_ACCOUNT_JSON` |
| `405` from worker | Used GET — worker is **POST only** |
| `400` Invalid job type | `type` not in `JOB_TYPES` set in `queue-worker` |
| `400` Missing job payload | JSON missing `job.id` or `job.type` |
| `500` Job failed | Handler threw (FK, duplicate ticket, etc.) — read `queue-worker` logs and exception message |
| Loyalty: no rows | `action_type` not in points map (zero points — no-op) |
| `gcloud` permission denied | Wrong GCP project; SA missing `cloudtasks.enqueuer` or queue IAM |

---

## Appendix: example JSON bodies (`--body-file`)

Replace UUIDs and timestamps. Then:

`gcloud tasks create-http-task --project=... --queue=... --location=... --url="$WORKER_URL" --method=POST --oidc-service-account-email="$SA_EMAIL" --oidc-token-audience="$WORKER_URL" --header="Content-Type: application/json" --body-file=task-tickets.json`

**task-tickets.json**

```json
{
  "job": {
    "id": "job_test_tickets_manual",
    "type": "tickets.issue",
    "payload": {
      "order_id": "00000000-0000-0000-0000-000000000000",
      "event_id": "00000000-0000-0000-0000-000000000000",
      "ticket_tier_id": null,
      "user_id": "00000000-0000-0000-0000-000000000000",
      "quantity": 1
    },
    "createdAt": "2026-03-20T12:00:00Z",
    "maxAttempts": 3
  }
}
```

**task-rsvp.json** — same envelope; `type` `rsvp.auto_mark_going`, payload `{ "user_id", "event_id", "status": "going" }`.

**task-loyalty.json** — `type` `loyalty.award_points`, payload `{ "user_id", "action_type": "buy_ticket", "description": "..." }`.

---

## Reference

- Setup: [CLOUD_TASKS.md](CLOUD_TASKS.md)
- Follow-up tasks: [FOLLOWUP_OBSERVABILITY_AND_CI.md](FOLLOWUP_OBSERVABILITY_AND_CI.md)
- Source: [`queue-worker/index.ts`](../../supabase/functions/queue-worker/index.ts), [`job-handlers.ts`](../../supabase/functions/_shared/job-handlers.ts), [`stripe-webhook/index.ts`](../../supabase/functions/stripe-webhook/index.ts)
