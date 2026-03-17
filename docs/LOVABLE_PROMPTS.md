# Lovable Prompts for Supabase Operations

> Use these prompts with Lovable when Supabase CLI, migrations, or dashboard access is required. Until migration to self-hosted Supabase, all DB/migration/edge-function work goes through Lovable.

---

## Migrations

### is_profile_public fix

**File:** `supabase/migrations/20260317130000_fix_is_profile_public.sql`

**Prompt:**
```
Apply the migration in supabase/migrations/20260317130000_fix_is_profile_public.sql. It updates is_profile_public() to check profiles.profile_tier (personal = private, professional = public) instead of returning true.
```

### rsvps unique constraint

**Prompt:**
```
Add unique constraint on rsvps(event_id, user_id):
CREATE UNIQUE INDEX IF NOT EXISTS rsvps_event_user_unique ON rsvps(event_id, user_id);
```

---

## Edge Functions — Deploy

**When:** After changes to `supabase/functions/*`.

**Prompt:**
```
Deploy the edge functions in supabase/functions/. Key functions: stripe-connect-onboard, stripe-connect-status, stripe-connect-dashboard, stripe-webhook, orders-expire-cleanup, refunds-create, orders-cancel, checkin-qr, message-send, event-media-manage, payments-intent, orders-reserve.
Ensure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set in Edge Function secrets.
```

### checkin-qr (standalone)

**Prompt:**
```
Deploy the checkin-qr edge function from supabase/functions/checkin-qr/. No migrations needed — tickets and check_ins tables exist.
```

---

## Edge Function Secrets

**Prompt:**
```
In Supabase Dashboard → Project Settings → Edge Functions → Secrets, ensure:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- CRON_SECRET (for orders-expire-cleanup; cron calls with X-Cron-Secret header)
```

---

## Build / Deploy Env

**Prompt:**
```
Add to build/deploy env:
- VITE_STRIPE_PUBLISHABLE_KEY (pk_test_... or pk_live_... from Stripe Dashboard → API keys)
```

---

## Rate limiting (message-send)

**When:** If event-message rate limiting fails.

**Prompt:**
```
The message-send edge function uses check_rate_limit RPC with key 'event-message-send'. Verify rate_limits table and check_rate_limit RPC exist. The RPC may accept arbitrary keys dynamically.
```

---

*Last updated: 2026-03-16*
