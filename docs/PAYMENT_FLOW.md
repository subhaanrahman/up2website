# Payment Flow Documentation

> Last updated: 2026-03-16

## Webhook URL

Stripe webhooks are configured to point at the Supabase Edge Function:

```
{SUPABASE_URL}/functions/v1/stripe-webhook
```

Example: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`

**Required env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## Handled Events

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Confirm order, issue tickets, auto-RSVP, award loyalty points |
| `payment_intent.payment_failed` | Log only; reservation stays active until expiry |
| `charge.refunded` | Update order to `refunded`, cancel tickets, record in `refunds` |
| `account.updated` | Update `organiser_stripe_accounts` (charges_enabled, payouts_enabled, onboarding_complete) |

Unhandled events are logged and acknowledged but not processed.

---

## Order Lifecycle

```
reserved → payment_pending → confirmed → refunded
                            → partially_refunded
         → failed → (can retry → reserved)
         → expired
         → cancelled (user-initiated)
```

- **reserved** — Created by `orders-reserve`; PaymentIntent created by `payments-intent`
- **confirmed** — Set by `stripe-webhook` on `payment_intent.succeeded`
- **refunded** — Set by `stripe-webhook` on `charge.refunded` or by `refunds-create` (future)

---

## Ticket Issuance Path

1. `payment_intent.succeeded` → webhook confirms order
2. Webhook enqueues `tickets.issue` job
3. Job handler creates `tickets` rows with unique QR codes per ticket
4. `rsvp.auto_mark_going` and `loyalty.award_points` enqueued in parallel

---

## Idempotency

- `payment_events` table stores `stripe_event_id` (unique)
- Before processing, webhook checks `payment_events` for existing `stripe_event_id`
- If found, returns 200 with `{ received: true }` without processing
- After processing, inserts into `payment_events` for audit

---

## Retry Behavior

- Stripe retries failed webhooks (4xx/5xx responses) with exponential backoff
- Webhook returns 200 on success; returns 500 when critical steps fail (e.g. `payment_events` insert) so Stripe retries; idempotency ensures a retry will skip re-processing (order already `confirmed`)
- Order confirmation is idempotent: if order already `confirmed`, skip update

---

## Queue and Follow-Up Jobs

Webhook follow-up work (tickets, RSVP, loyalty) is dispatched via the in-process queue.

- **Job types:** `tickets.issue`, `rsvp.auto_mark_going`, `loyalty.award_points`
- **Max attempts:** 3 per job (configurable via `enqueue` options)
- **On failure:** Handler throws; queue retries up to `maxAttempts`
- **On exhaustion:** Job is discarded, error logged (`[queue] Job X exhausted retries`)
- **Manual recovery:** Orders confirmed but without tickets (rare) would need admin tooling or DB fix (future). No automatic alert currently.

---

## Stripe Connect Onboarding Flow

1. User clicks "Set up payouts" (any touchpoint)
2. `stripe-connect-onboard` edge function creates/retrieves Express account, returns Account Link URL
3. User redirects to Stripe hosted onboarding
4. Stripe redirects back to `/profile/edit-organiser?stripe_onboard=complete`
5. `PayoutSetupSection` detects param, refetches status via `stripe-connect-status`
6. `account.updated` webhook keeps `organiser_stripe_accounts` in sync

**Touchpoints:** PayoutSetupSection, OnboardingRequired page, TicketingPanel, OrganiserPayoutTask (floating pill)
