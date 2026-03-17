# Backend TODO

> Last updated: 2026-03-16

## Critical Fixes

- [x] **Create `get_user_group_chats` RPC** — Created in migration `20260312130000_optimize_group_chats.sql`.
- [x] **Fix `is_profile_public()` function** — Migration `20260317130000_fix_is_profile_public.sql`; apply via Lovable (see docs/LOVABLE_PROMPTS.md).
- [x] **Expired order cleanup** — Edge function `orders-expire-cleanup` deployed; cron setup via Lovable (see docs/LOVABLE_PROMPTS.md).
- [x] **Add `publish_at` filter to event queries** — All public event queries filter `publish_at IS NULL OR publish_at <= now()`.
- [x] **Add `status` filter to event queries** — All public event queries filter `status = 'published'`.

## Check-In System
- [x] Create `check_ins` table (event_id, user_id, checked_in_at, checked_in_by, method: 'manual' | 'qr')
- [x] Edge function: `checkin-toggle` — mark/unmark a guest as checked in
- [x] Edge function: `checkin-qr` — validate ticket QR code, check in guest, update tickets.checked_in_at
- [x] Check-in page UI: searchable attendee list, manual toggle, camera-based ticket QR scanner
- [x] RLS: only event host / organiser owner / members can check in guests
- [ ] QR code generation for ticket holders (link to checkin-qr)

## Orders Management
- [x] `orders` table exists
- [x] `orders-reserve` edge function
- [x] `payments-intent` edge function
- [x] `orders-list` edge function — list orders for an event (host-only)
- [x] Webhook: `stripe-webhook` — confirm order on payment success
- [x] `ticket_tier_id` added to orders for tier-specific tracking
- [x] Payment onboarding touchpoints (OnboardingRequired, TicketingPanel, OrganiserPayoutTask, PayoutSetupSection) — all use shared `useStripeConnectOnboard` flow

## Refunds
- [x] `refunds` table exists
- [x] Edge function: `refunds-create` — initiate Stripe refund, update order, cancel tickets
- [x] Edge function: `orders-cancel` — cancel reserved (unpaid) order
- [x] Edge function: `orders-expire-cleanup` — marks expired reservations, cancels PaymentIntents
- [x] Event cancellation flow — bulk refund on event delete

## Media Gallery
- [x] Create `event_media` table (event_id, url, sort_order, uploaded_by, created_at)
- [ ] Edge function or direct storage upload for event media
- [ ] RLS: host/organiser can upload, public can view

## Event Board (Attendee Chat)
- [x] `event_messages` table with RLS (attendees + host only)
- [x] Realtime enabled on `event_messages`
- [x] `EventBoard` component with live message feed
- [x] Access gated by RSVP, ticket, or host status
- [ ] Message deletion by author or host
- [ ] Rate limiting on message sends

## Share & Ticket Links
- [x] Share event link & RSVP link with copy-to-clipboard
- [x] QR code generation for event URL
- [ ] Track link clicks / conversions

## Direct Messaging (Organiser DMs)
- [x] DM schema implemented (`dm_threads`, `dm_messages`)
- [x] User can message organiser profiles
- [x] Organiser can view/respond to DMs
- [ ] Organiser-initiated DMs (outbound)
- [ ] Realtime enabled on DM tables
- [ ] Notification integration for new DM messages
- [ ] Unread message counts per thread

## Group Chat Improvements
- [x] Create `get_user_group_chats` RPC — Done in migration `20260312130000_optimize_group_chats.sql`
- [ ] Realtime on group chat messages
- [ ] Group chat notification integration

## Analytics
- [x] `dashboard-analytics` edge function (basic)
- [ ] Per-event view tracking
- [ ] Detailed sales & revenue dashboard
- [ ] Attendee demographics

## Waitlist
- [ ] Wire `rsvp_join` to enqueue to waitlist instead of raising exception at capacity
- [ ] Notification flow when spots open
- [ ] Waitlist position management

## Event Reminders
- [ ] Scheduled job to send configured reminders (24h before, 1h before, etc.)
- [ ] Use existing `event_reminders` table configuration

## Guestlist Approval
- [ ] Approval/rejection UI for hosts
- [ ] Enforce `guestlist_deadline` in RSVP flow
- [ ] Enforce `guestlist_require_approval` — hold RSVPs as pending until approved

## VIP Tables (Future)
- [ ] Design table booking schema
- [ ] Payment flow for table reservations

---

*Last updated: 16 March 2026*

See `docs/PAYMENT_FLOW.md` for webhook details and order lifecycle.
