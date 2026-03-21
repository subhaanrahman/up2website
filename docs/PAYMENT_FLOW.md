# Payment Flow Documentation

> Last updated: 2026-03-22

## Webhook URL

Stripe webhooks are configured to point at the Supabase Edge Function:

```
{SUPABASE_URL}/functions/v1/stripe-webhook
```

Example: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`

**Required env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Stopping new checkouts (operations)

Set Edge Function secret **`PAYMENTS_DISABLED`** to `1`, `true`, or `yes` on:

- `orders-reserve`
- `payments-intent`
- `vip-reserve`
- `vip-payments-intent`

Those functions return **503** with `code: payments_disabled`. Existing reservations and the **Stripe webhook** are unaffected (refunds and confirmations still flow).

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
- **refunded** — Set by `stripe-webhook` on `charge.refunded` or by `refunds-create` edge function
- **cancelled** — User-initiated via `orders-cancel` (reserved orders only)

---

## Standard ticket flow — implementation checklist

**Standard paid ticketing** is implemented end-to-end in the app:

| Step | Mechanism |
|------|-----------|
| Connect onboarding | `stripe-connect-onboard`, `stripe-connect-status`, `account.updated` → `organiser_stripe_accounts` |
| Platform fee | **7% on top** of ticket price (`orders-reserve` / `payments-intent`, `application_fee_amount` to platform) |
| Checkout | `orders-reserve` → `payments-intent` → Stripe → `payment_intent.succeeded` → `stripe-webhook` → ticket + RSVP + loyalty jobs |
| Refunds | Organiser `refunds-create`; policy + buyer `refunds-request-self`; Manage Event ledger via `orders-list` (`refunds[]`); host notification on self-service |

**Manual acceptance** (real Stripe test mode): [Manual QA playbook (sandbox)](#manual-qa-playbook-sandbox).

---

## Guestlist vs VIP tables (product)

- **Guestlist** — RSVP / approval / capacity / members-only rules; **free or non–card** entry. Not the same as paid tickets or VIP minimum spend.
- **VIP tables** — **High minimum-spend table reservations** (larger payments). Backend is **partially** shipped; remaining webhook/reconciliation/fee strategy work lives under **VIP tables / high-AOV (deferred epic)** in [PLATFORM_TODOS.md](PLATFORM_TODOS.md).

---

## Troubleshooting: `401` / Invalid JWT

Protected functions (`events-create`, `stripe-connect-status`, etc.) need a valid `Authorization: Bearer <access_token>`.

1. **`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`** must be from the **same** Supabase project as the deployed functions.
2. After changing `.env`, **sign out and sign in** so stored sessions match the project JWT secret.
3. The client avoids calling protected functions until auth has hydrated and a session exists; if you still see 401, check for mixed staging/production keys or expired refresh tokens.

More detail: [TESTING_GUIDE.md](TESTING_GUIDE.md) (Invalid JWT / env mismatch).

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

---

## Expired Order Cleanup

The `orders-expire-cleanup` edge function marks reserved orders with `expires_at < now()` as `expired`, cancels orphaned Stripe PaymentIntents, and releases capacity.

**Invocation:** Call on a schedule (e.g. every 5–15 minutes):
- **Option A:** External cron (Vercel, GitHub Actions, etc.) POST to `{SUPABASE_URL}/functions/v1/orders-expire-cleanup` with header `X-Cron-Secret: <CRON_SECRET>` (set in Edge Function secrets).
- **Option B:** Pass `Authorization: Bearer <service_role_key>` if the scheduler has it.

**Required:** `STRIPE_SECRET_KEY`, optional `CRON_SECRET` for cron auth.

---

## Refunds and Order Cancellation

**refunds-create** — Organiser/host initiates Stripe refund for a confirmed order. Updates order to `refunded`, cancels tickets, inserts `refunds` record. Auth: event host or organiser owner/member.

**refunds-request-self** — Ticket buyer requests a refund when the event has `refunds_enabled` and the request is within policy (before event start and optional hours-before cutoff). Calls the same `processRefund` path; notifies the event host.

**orders-cancel** — Cancels a reserved (unpaid) order. Cancels Stripe PaymentIntent if exists, releases capacity. Auth: order owner or event host/organiser.

**Event deletion** — When an organiser deletes an event via `events-update` (action: delete), all confirmed orders are refunded first via `processRefund`, then the event is deleted.

---

## Organiser dashboard data paths

RLS on `orders` and `refunds` only allows buyers to **SELECT their own** rows. The **Manage Event** screen must not rely on the browser client to list all orders/refunds for an event.

| Data | Mechanism | Auth |
|------|-----------|------|
| Orders, RSVPs, VIP reservations (enriched) | **`orders-list`** edge function (service role) | Host or organiser owner/member |
| Ticket refunds for those orders | **`orders-list`** attaches `refunds[]` per order (same response) | Same |
| Organiser-initiated refund action | **`refunds-create`** | Host or organiser owner/member |
| Buyer self-service refund | **`refunds-request-self`** | Order owner only; event `refunds_enabled` |

---

## Stripe sandbox checklist (test mode)

1. **Dashboard:** Stripe → Developers → API keys — use **test** secret in Supabase Edge secrets (`STRIPE_SECRET_KEY`) and **test** publishable in app (`VITE_STRIPE_PUBLISHABLE_KEY`).
2. **Webhooks:** Endpoint `{SUPABASE_URL}/functions/v1/stripe-webhook` with events at least: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `account.updated`. Copy signing secret to `STRIPE_WEBHOOK_SECRET`.
3. **Connect:** Create a test Express connected account; complete onboarding until `charges_enabled` is true (use `stripe-connect-status` from the app).
4. **Cards:** Use Stripe test cards (e.g. `4242 4242 4242 4242`) for successful payment; [decline cards](https://stripe.com/docs/testing#declined-payments) for failure paths.
5. **Local tunnel (optional):** Stripe CLI `stripe listen --forward-to …` if the project URL is not publicly reachable for webhooks.
6. **Ops:** `PAYMENTS_DISABLED` on reserve/intent functions stops **new** checkouts only; refunds and webhooks still run.

---

## Manual QA playbook (sandbox)

1. Apply migration `20260321120000_event_refund_policy.sql` (or full `supabase db push` / equivalent).
2. Deploy edge functions including **`refunds-request-self`** and updated **`orders-list`**, **`events-create`**, **`events-update`**.
3. As organiser: create an event with a **paid** tier, enable **Allow ticket refunds** in Ticketing (optional deadline hours + policy text).
4. As buyer: complete checkout with a test card; confirm ticket appears under **My Tickets** / event detail.
5. **Manage Event → Refunds:** after an organiser refund from Orders tab (or after webhook-driven refund), verify rows appear (data from `orders-list`, not client RLS).
6. **Self-service:** as buyer, use **Request refund** on event detail or the rotate icon on **My Tickets**; confirm order `refunded`, tickets cancelled, host receives an in-app notification linking to manage.
7. Toggle **deadline hours**: move clock or use an event far in the future / past to confirm eligibility messaging matches `ticketSelfRefundAllowed` (see `src/utils/refundEligibility.test.ts`).
