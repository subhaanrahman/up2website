# Stripe Integration TODO — Up2 Marketplace

> Last updated: 2026-03-16

## Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Done | Real payment completion |
| Phase 2 | ✅ Done | Payout architecture (Stripe Connect) |
| Phase 3 | ⏳ Pending | Refunds, cleanup, audit |

---

## Phase 1 — Real Payment Completion ✅

All items implemented:

- [x] Connect DB `ticket_tiers` to EventDetail + PurchaseModal (remove mock tiers)
- [x] Fix `isFreeEvent` logic — now checks `ticket_tiers` with `priceCents > 0`
- [x] Wire checkout page to `orders-reserve` edge function
- [x] Wire Stripe Elements to `payments-intent` edge function `client_secret`
- [x] Create `stripe-webhook` edge function (`payment_intent.succeeded`, `payment_intent.payment_failed`)
- [x] Confirm order on webhook success → `status = 'confirmed'`
- [x] Create `tickets` table — issue ticket records with unique QR codes on payment
- [x] Auto-RSVP user on confirmed purchase
- [x] Award loyalty points on ticket purchase
- [x] Add `ticket_tier_id` and `platform_fee_cents` to orders table
- [x] Add `payment_events` audit table for webhook idempotency
- [x] Fix capacity check — parallel count of RSVPs + active reservations
- [x] Event status check — only `published` events allow ticket sales
- [x] Tier-level inventory check
- [x] **Pricing model fix** — `amount_cents` = ticket_price + 7% service_fee (customer total). `platform_fee_cents` = service_fee. Organiser receives ticket_price via destination charge.
- [x] **Server-side Connect validation in `orders-reserve`** — blocks paid ticket reservations if organiser hasn't completed Stripe Connect
- [x] **`payment_intent.payment_failed` no longer permanently fails** — reservation stays active until natural expiry

### Remaining Phase 1 pre-launch items

- [ ] **Replace Stripe publishable key** — move `pk_test_PLACEHOLDER` in `src/lib/stripe.ts` to `VITE_STRIPE_PUBLISHABLE_KEY` env var
- [ ] **Verify `STRIPE_WEBHOOK_SECRET`** — create webhook endpoint in Stripe dashboard, confirm signing secret matches
- [ ] **Add unique constraint on `rsvps (event_id, user_id)`** — needed for upsert in webhook
- [ ] **Test end-to-end** with Stripe test mode

---

## Phase 2 — Payout Architecture (Stripe Connect) ✅

### 2.1 Database
- [x] `organiser_stripe_accounts` table with onboarding/capability tracking
- [x] `stripe_account_id` column on `orders` for audit

### 2.2 Edge Functions
- [x] `stripe-connect-onboard` — creates Express connected account, returns Account Link URL
- [x] `stripe-connect-status` — fetches and updates capabilities from Stripe
- [x] `stripe-connect-dashboard` — creates login link for organiser payout dashboard

### 2.3 Payment Flow
- [x] `payments-intent` uses destination charges with `application_fee_amount` and `transfer_data.destination`
- [x] Pre-sale check: organiser must have `charges_enabled = true`
- [x] `stripe_account_id` stored on order for audit

### 2.4 Webhook Updates
- [x] Handle `account.updated` — update `organiser_stripe_accounts` when Stripe reports capability changes
- [ ] Handle `payout.paid` / `payout.failed` — optional, for organiser payout status tracking

### 2.5 UI
- [x] "Set up payouts" button/flow on organiser profile settings (PayoutSetupSection)
- [x] Payout status indicator on organiser dashboard settings
- [x] Block paid ticket tier creation if organiser hasn't completed onboarding
- [x] Onboarding gate + OnboardingRequired page (draft save with free tiers)
- [x] "Set up payouts" button in TicketingPanel when payouts not ready
- [x] OrganiserPayoutTask floating pill for organisers with incomplete payouts
- [x] Stripe Connect return URLs fixed: `/profile/edit-organiser` (was `/organiser/edit`)
- [x] All touchpoints use shared `useStripeConnectOnboard` hook

---

## Phase 3 — Refunds, Cleanup & Audit

### 3.1 Database
- [x] `refunds` table exists (order_id, stripe_refund_id, amount_cents, reason, status, initiated_by)

### 3.2 Edge Functions
- [x] `refunds-create` — initiates Stripe refund, records in `refunds`, updates order, cancels tickets
- [x] `orders-cancel` — cancels reserved order, cancels PaymentIntent, releases capacity
- [x] `orders-expire-cleanup` — scheduled/cron function that:
  - Finds orders with `status = 'reserved'` and `expires_at < now()`
  - Sets them to `expired`
  - Cancels any orphaned Stripe PaymentIntents
  - Releases capacity

### 3.3 Webhook Updates
- [ ] Handle `charge.refunded` — update order status to `refunded`, mark tickets as `cancelled`
- [ ] Handle `charge.dispute.created` — flag order, notify admin

### 3.4 Order State Machine (target)

```
reserved → payment_pending → confirmed → refunded
                            → partially_refunded
         → failed → (can retry → reserved)
         → expired
         → cancelled (user-initiated)
```

### 3.5 Event Cancellation Flow
- [x] When an organiser deletes an event (`events-update` action: delete):
  - Refund all `confirmed` orders via `processRefund`
  - Delete event

### 3.6 Audit & Observability
- [x] `payment_events` table exists for webhook logging
- [ ] Add admin-facing order history view (future)
- [ ] Add reconciliation query: compare Stripe PaymentIntents with local orders

---

## Architecture Notes

### Stripe Connect Model: Destination Charges
Up2 uses **destination charges** because:
- Up2 is merchant of record (handles disputes, refunds)
- Single charge to customer, automatic transfer to organiser
- Platform fee is explicit via `application_fee_amount`
- Simpler than separate charges + transfers

### Security Invariants
- All prices are derived server-side from `ticket_tiers` or `events.ticket_price_cents`
- Client never sends amounts — only `event_id`, `ticket_tier_id`, `quantity`
- Webhook verifies Stripe signature before processing
- Idempotency via `payment_events.stripe_event_id` unique constraint
- Order confirmation only happens via webhook, never client-side

### "Set up payouts" troubleshooting

If "Set up payouts" returns an error, the `stripe-connect-onboard` edge function now returns clearer messages:

| Message | Fix |
|---------|-----|
| "Stripe is not configured..." | Add `STRIPE_SECRET_KEY` (starts with `sk_test_` or `sk_live_`) in Supabase Dashboard → Project Settings → Edge Functions → Secrets |
| "Invalid Stripe API key..." | Ensure the key is the **secret** key (sk_), not the publishable key (pk_) |
| "Email required for payout setup" | User must have an email on their account (Stripe Express requires it). Add via Settings or use email-based auth |
| "Authorization check failed..." | Ensure the user is the owner of the organiser profile (`organiser_profiles.owner_id`) |

**Deploying edge function changes:** After editing `supabase/functions/stripe-connect-onboard/index.ts`, deploy with:
```bash
supabase functions deploy stripe-connect-onboard
```
(or deploy all: `supabase functions deploy`). With `npm run dev`, the frontend runs locally but calls the deployed Supabase edge functions.

### Future Considerations
- Multi-currency: currently defaults to ZAR, will need per-event currency
- Ticket transfers: `tickets` table supports `status = 'transferred'`
- Discount codes: `validate-discount` edge function exists, server validation in place
- Mobile: Stripe Elements works in WebView; React Native would use `@stripe/stripe-react-native`

---

*Last updated: 16 March 2026*

See `docs/PAYMENT_FLOW.md` for webhook URL, handled events, order lifecycle, and idempotency.
