# Backend TODO

## Check-In System
- [ ] Create `check_ins` table (event_id, user_id, checked_in_at, checked_in_by, method: 'manual' | 'qr')
- [ ] Edge function: `checkin-toggle` — mark/unmark a guest as checked in
- [ ] Edge function: `checkin-qr` — validate QR code and check in guest
- [ ] Check-in page UI: searchable attendee list with manual toggle + QR scan mode
- [ ] RLS: only event host / organiser owner / members can check in guests

## Orders Management
- [x] `orders` table exists
- [x] `orders-reserve` edge function
- [x] `payments-intent` edge function
- [ ] Edge function: `orders-list` — list orders for an event (host-only)
- [ ] Webhook: `stripe-webhook` — confirm order on payment success
- [ ] Add `ticket_tier_id` to orders for tier-specific tracking

## Refunds
- [ ] Create `refund_requests` table (order_id, reason, status, created_at, processed_at)
- [ ] Edge function: `refunds-request` — guest requests refund
- [ ] Edge function: `refunds-process` — host approves/denies refund
- [ ] Stripe refund integration via webhook

## Media Gallery
- [ ] Create `event_media` table (event_id, url, sort_order, uploaded_by, created_at)
- [ ] Edge function or direct storage upload for event media
- [ ] RLS: host/organiser can upload, public can view

## VIP Tables (Future)
- [ ] Design table booking schema
- [ ] Payment flow for table reservations
