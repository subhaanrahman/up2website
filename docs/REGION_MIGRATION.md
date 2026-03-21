# Moving Up2 to a new Supabase region

Supabase does **not** allow changing the primary database region in place. To host closer to Australia / US users (e.g. Sydney or Singapore instead of Mumbai), create a **new project** in the target region and migrate.

This is a **manual** checklist (CLI + Dashboard). Expect **forced re-login** for all users after Auth migration.

---

## 1. Create the new project

1. Supabase Dashboard → **New project** → choose **region** (e.g. `ap-southeast-2` Sydney, or `ap-southeast-1` Singapore).
2. Save **Project URL**, **anon/publishable key**, **service role key** (CI/secrets only).

---

## 2. Schema

**Option A — from this repo (greenfield DB):**

```bash
supabase link --project-ref <NEW_PROJECT_REF>
supabase db push
```

**Option B — copy schema from old project:**

- Use `pg_dump` schema-only from the old database, or Supabase backup docs, then apply on the new project.

---

## 3. Data

- Logical dump/restore of `public` tables (respect **foreign key order**), or table-by-table CSV/import.
- Re-run any **seed** scripts if you use them for non-prod.

---

## 4. Auth users

- Follow [Supabase migration / user export](https://supabase.com/docs/guides/platform/migrating-to-supabase) for your chosen path.
- **Sessions and refresh tokens** from the old project do not carry over — plan a short maintenance message or forced sign-out in the app.

---

## 5. Storage

- Recreate **buckets** and **policies** (match names from old project).
- Copy objects (CLI `supabase storage` or scripts). If the DB stores **full public URLs**, run a one-off update to the new project’s storage host if URLs change.

---

## 6. Edge Functions

```bash
supabase secrets set --project-ref <NEW_REF> STRIPE_SECRET_KEY=... # etc.
supabase functions deploy --project-ref <NEW_REF>
```

Copy every secret the old project used (Stripe, Twilio, etc.). See [PAYMENT_FLOW.md](PAYMENT_FLOW.md) for webhook URL shape.

---

## 7. Stripe (and other webhooks)

- Stripe Dashboard → Webhooks → endpoint URL must point to **new** project:  
  `https://<NEW_REF>.supabase.co/functions/v1/stripe-webhook`
- Update signing secret in Supabase secrets to match.

---

## 8. Application environment

- **Vite / hosting:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (and any `VITE_SUPABASE_PROJECT_ID` if used).
- **CI / server:** service role key, deploy hooks.
- Redeploy the web app and smoke-test **auth**, **feed**, **events-create**, **checkout**.

---

## 9. Cutover

- Freeze writes on the old app (maintenance mode) during final **delta** data sync if you need minimal loss.
- Point DNS / hosting to the new build.
- Monitor **Logs** and **Database** health on the new project.

---

## Overnight-friendly scope

- **Low risk tonight:** new project + `db push` + seed + latency smoke test (no production users).
- **Full production cutover** usually needs a planned window for Auth + Storage + webhook updates.
