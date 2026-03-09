# Stripe Integration TODO — Up2 Marketplace

## Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Done | Real payment completion |
| Phase 2 | ⏳ Pending | Payout architecture (Stripe Connect) |
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

### Remaining Phase 1 pre-launch items

- [ ] **Add Stripe publishable key** — replace `pk_test_PLACEHOLDER` in `src/lib/stripe.ts`
- [ ] **Add `STRIPE_WEBHOOK_SECRET`** — create webhook endpoint in Stripe dashboard, add signing secret as backend secret
- [ ] **Add unique constraint on `rsvps (event_id, user_id)`** — needed for upsert in webhook
- [ ] **Test end-to-end** with Stripe test mode

---

## Phase 2 — Payout Architecture (Stripe Connect)

Up2 is a marketplace. Organisers/venues are the payout recipients. This phase adds Stripe Connect so money flows correctly.

### 2.1 Database

- [ ] Create `organiser_stripe_accounts` table:
  ```
  organiser_profile_id (FK → organiser_profiles, UNIQUE)
  stripe_account_id (text, acct_xxx)
  onboarding_complete (boolean)
  charges_enabled (boolean)
  payouts_enabled (boolean)
  created_at, updated_at
  ```
- [ ] Add `stripe_account_id` column to `orders` — records which connected account received funds

### 2.2 Edge Functions

- [ ] `stripe-connect-onboard` — creates a Stripe Express connected account for an organiser profile, returns an Account Link URL for onboarding
- [ ] `stripe-connect-status` — fetches and updates `charges_enabled` / `payouts_enabled` from Stripe for a connected account
- [ ] `stripe-connect-dashboard` — creates a Stripe login link so organisers can view their payouts

### 2.3 Payment Flow Changes

- [ ] Update `payments-intent` to use **destination charges**:
  ```typescript
  stripe.paymentIntents.create({
    amount: order.amount_cents,
    currency: order.currency,
    application_fee_amount: order.platform_fee_cents,
    transfer_data: {
      destination: organiserStripeAccountId,
    },
    ...
  });
  ```
- [ ] Before allowing ticket sales, check that the organiser's connected account has `charges_enabled = true`
- [ ] Store `stripe_account_id` on the order for audit

### 2.4 Webhook Updates

- [ ] Handle `account.updated` — update `organiser_stripe_accounts` when Stripe reports capability changes
- [ ] Handle `payout.paid` / `payout.failed` — optional, for organiser payout status tracking

### 2.5 UI

- [ ] Add "Set up payouts" button/flow on organiser profile settings
- [ ] Show payout status indicator on organiser dashboard
- [ ] Block ticket creation/sales if organiser hasn't completed Stripe onboarding

---

## Phase 3 — Refunds, Cleanup & Audit

### 3.1 Database

- [ ] Create `refunds` table:
  ```
  order_id (FK → orders)
  stripe_refund_id (text)
  amount_cents (integer)
  reason (text)
  status (text: pending, succeeded, failed)
  initiated_by (uuid — user or admin)
  created_at
  ```

### 3.2 Edge Functions

- [ ] `refunds-create` — initiates a Stripe refund, records in `refunds` table, updates order status, cancels tickets
- [ ] `orders-cancel` — cancels a reserved (unpaid) order, cancels associated Stripe PaymentIntent if exists
- [ ] `orders-expire-cleanup` — scheduled/cron function that:
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

- [ ] When an organiser cancels an event:
  - Find all `confirmed` orders for that event
  - Initiate Stripe refunds for each
  - Update order statuses to `refunded`
  - Cancel all tickets
  - Notify all ticket holders

### 3.6 Audit & Observability

- [ ] `payment_events` table already exists — ensure all webhook events are logged
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

### Future Considerations

- Multi-currency: currently defaults to ZAR, will need per-event currency
- Ticket transfers: `tickets` table supports `status = 'transferred'`
- Discount codes: `orders` has `discount_code_id` column ready, server validation needed in `orders-reserve`
- Mobile: Stripe Elements works in WebView; React Native would use `@stripe/stripe-react-native`
