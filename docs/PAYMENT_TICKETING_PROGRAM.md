# Payment and ticketing finalization program

> **Purpose:** Single checklist for closing **Stripe test-mode** validation (buyer + organiser), ops prerequisites, and test strategy.  
> **Do not duplicate** technical Stripe mechanics — canonical reference is [PAYMENT_FLOW.md](PAYMENT_FLOW.md).  
> **Backlog and platform-wide items:** [PLATFORM_TODOS.md](PLATFORM_TODOS.md).  
> **Commands:** [TESTING_GUIDE.md](TESTING_GUIDE.md).

Last updated: 2026-03-25 (Platform backlog reordered; pre-launch section now pending-only)


## What is already implemented (no duplicate spec here)

- Standard ticketing: reserve → pay → webhook → tickets; Connect onboarding; platform fee; organiser + self-service refunds; Manage Event via `orders-list`. See [PAYMENT_FLOW.md](PAYMENT_FLOW.md) and [PLATFORM_TODOS.md — Ticketing Flow](PLATFORM_TODOS.md#ticketing-flow--standard-tickets-stripe).
- **Business vs attendee:** organiser experience is driven by `organiser_profiles` and [`ActiveProfileContext`](../src/contexts/ActiveProfileContext.tsx) (`personal` | `organiser`). A separate DB “is_business” flag is optional future work, not required for this program.

---

## Host RSVP invites (guest list / free RSVP events)

- **Who can invite:** Event host, organiser **owner** or **accepted** `organiser_members`, or **cohost** (user row on `event_cohosts` or organiser owner for an organiser cohost). Same idea as guestlist approval; aligns with `orders-list` plus cohosts.
- **UI:** **Manage Event** → **Send RSVP invites** → [`/events/:id/send-rsvp`](../src/pages/SendRsvp.tsx). Search by **username** (prefix match), multi-select up to **25** users per request.
- **Backend:** Postgres RPC `rsvp_host_invite` mirrors `rsvp_join` per invitee (guestlist enabled, deadline, approval → `pending`, capacity / waitlist, idempotent `already_rsvp`). Edge functions: `profile-search-host` (scoped search; requires manage rights), `rsvp-bulk-invite` (calls RPC + optional notifications).
- **Notifications:** Successful adds enqueue an in-app notification (`shared_event`) to each invitee (skipped for self-invite).

**Manual QA (host RSVP):**

| # | Check |
|---|--------|
| 1 | User without manage rights → `403` on `profile-search-host` and `rsvp-bulk-invite`. |
| 2 | Select up to 25 distinct users; 26th selection blocked in UI; RPC dedupes + caps at 25. |
| 3 | Re-invite existing same-status attendee → `already_rsvp` in results, no error toast. |
| 4 | Guestlist disabled / past deadline → per-user `error` row in RPC results. |
| 5 | At capacity with **new** user → `waitlisted` (mirrors `rsvp_join`). |
| 6 | Cohost or organiser member can search + invite (same matrix as above). |

**Automated (regression):** Vitest — [`src/utils/hostRsvpInvite.test.ts`](../src/utils/hostRsvpInvite.test.ts), [`src/pages/SendRsvp.test.tsx`](../src/pages/SendRsvp.test.tsx), [`TicketEventCard` status pills](../src/components/TicketEventCard.test.tsx). Playwright — [`tests/e2e/send-rsvp.spec.ts`](../tests/e2e/send-rsvp.spec.ts) (authenticated shell: heading + search field). Does not replace manual rows above.

### RSVP / guestlist state vs paid order lifecycle

- **Paid tickets:** Order states such as `reserved`, `confirmed`, `refunded` describe **Stripe checkout and webhooks** — canonical detail is [PAYMENT_FLOW.md](PAYMENT_FLOW.md) (not duplicated here).
- **RSVPs:** Status on `rsvps` (`going`, `pending`, `interested`, `not_going`, …) is separate from payment. **My Plans** uses a **Saved** pill when the relationship is bookmark-only vs RSVP / ticket / hosting — see [`TicketEventCard`](../src/components/TicketEventCard.tsx).

---

## Phase A — Environment and ops (do first)

**Owner checklist** (tick when done):

- [x] `VITE_STRIPE_PUBLISHABLE_KEY` is `pk_test_...` in the **app / Vite** env (`.env`, host, CI) — owner confirmed **2026-03-22** (this is separate from Supabase-only secrets; the open release blockers are now the pending-only [PLATFORM_TODOS — Pre-launch](PLATFORM_TODOS.md#pre-launch)).
- [x] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase Edge secrets match **test** mode and the webhook endpoint `{SUPABASE_URL}/functions/v1/stripe-webhook` — owner confirmed **2026-03-22**.
- [ ] Supabase session aligns with the same project as Edge functions ([PAYMENT_FLOW — Troubleshooting 401](PAYMENT_FLOW.md#troubleshooting-401--invalid-jwt)).
- [ ] **`orders-expire-cleanup`** scheduled (cron or external) with `CRON_SECRET` if used — [PAYMENT_FLOW — Expired order cleanup](PAYMENT_FLOW.md#expired-order-cleanup).
- [ ] (Optional) Confirm `PAYMENTS_DISABLED` behavior on reserve/intent functions — [PAYMENT_FLOW](PAYMENT_FLOW.md#stopping-new-checkouts-operations).


## Phase B — Buyer (attendee) manual QA

Follow step-by-step: [PAYMENT_FLOW — Manual QA playbook (sandbox)](PAYMENT_FLOW.md#manual-qa-playbook-sandbox).

**Minimum coverage:**

| # | Check |
|---|--------|
| 1 | Event with paid tier → checkout → Stripe test card (e.g. `4242…`) → order **confirmed** → ticket visible (My Tickets / event UI). |
| 2 | Self-service refund when event allows refunds and deadline passes [`ticketSelfRefundAllowed`](../src/utils/refundEligibility.ts). |
| 3 | Declined card path — [Stripe testing — declines](https://stripe.com/docs/testing#declined-payments); reservation / expiry per docs. |

**Owner checklist:**

- [ ] Phase B complete (date): _______________

---

## Phase C — Organiser (business) manual QA

Requires Connect onboarding until charges are enabled. Flow: [PAYMENT_FLOW — Connect](PAYMENT_FLOW.md#stripe-connect-onboarding-flow).

| # | Step | Verify |
|---|------|--------|
| 1 | Create / switch to organiser profile | `/profile/create-organiser`, profile switcher |
| 2 | Stripe Connect | “Set up payouts” → return URL; status from `stripe-connect-status` / `account.updated` |
| 3 | Create event with **paid** tier + optional refund policy | Ticketing / Manage Event |
| 4 | Purchase as **another** user (or incognito) | End-to-end payment in test mode |
| 5 | **Manage Event → Orders** | Data from **`orders-list`** Edge function ([PAYMENT_FLOW — Organiser dashboard](PAYMENT_FLOW.md#organiser-dashboard-data-paths)) |
| 6 | Organiser refund | `refunds-create` from UI |
| 7 | Buyer self-service refund | When `refunds_enabled` and policy allow |

**Owner checklist:**

- [ ] Phase C complete (date): _______________

---

## Phase D — Automated tests (incremental)

| Layer | Direction |
|-------|-----------|
| **Unit** | Extend Vitest for pure helpers (eligibility, formatting) colocated with source — see [TESTING_GUIDE.md — Writing tests](TESTING_GUIDE.md#6-writing-tests). Host RSVP: [`hostRsvpInvite.test.ts`](../src/utils/hostRsvpInvite.test.ts), [`SendRsvp.test.tsx`](../src/pages/SendRsvp.test.tsx). |
| **E2E** | [`tests/e2e/checkout.spec.ts`](../tests/e2e/checkout.spec.ts) skips when `VITE_STRIPE_PUBLISHABLE_KEY` is missing or placeholder. [`tests/e2e/send-rsvp.spec.ts`](../tests/e2e/send-rsvp.spec.ts) smoke-loads Send RSVP (auth). Full payment E2E needs real `pk_test` in env and stable seed data — treat as **staging** hardening. |
| **Webhooks** | Prefer Stripe CLI or Dashboard replay + manual verification until a dedicated mock suite is justified. |

CI and Stripe E2E limits: [TESTING_GUIDE.md — Stripe checkout E2E and CI](TESTING_GUIDE.md#9-stripe-checkout-e2e-and-ci).

**Owner checklist:**

- [ ] Phase D: expanded tests or documented deferral (date): _______________

---

## Phase E — After test mode is stable (live cutover)

- New Stripe **live** keys + **live** webhook signing secret; re-run abbreviated B/C.
- [PLATFORM_TODOS — Pre-launch](PLATFORM_TODOS.md#pre-launch) (CORS, cleanup scheduler, environment parity, and remaining release blockers).

**Deferred** (not part of “standard tickets done”):

- VIP tables epic — [PLATFORM_TODOS.md](PLATFORM_TODOS.md#vip-tables--high-aov-deferred-epic).
- Stripe Phase 3 extras (disputes, payout tracking, reconciliation UI) — [PLATFORM_TODOS.md](PLATFORM_TODOS.md#stripe-phase-3-partial).

---
