

# Implementation Plan: Feature Gaps & Stubbed Flows

This is a large body of work. I'll group the included features into **5 implementation batches** ordered by dependency and complexity.

---

## Included Features (excluded codes removed)

**Broken/Stubbed Flows:** F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-10, F-12

**Feature Gaps:** P-02, P-03, P-05, P-06, P-07, P-10, P-11, P-12, P-14, P-15, P-18, P-19, P-21, P-23, P-24, P-25, P-28

---

## Batch 1 — Fix Broken/Stubbed Flows (Backend Wiring)

These are quick wins — UI already exists, just needs real backend calls.

### F-01: "Add" button on Suggested Friends
- Wire the "Add" button in `Index.tsx` (line 153) to insert into `connections` table with `status: 'pending'`
- Use existing `connections` table and RLS policies (INSERT already allowed for `requester_id = auth.uid()`)

### F-02: Feed Post "..." menu
- Add a `DropdownMenu` to the `MoreHorizontal` button in `FeedPost.tsx` (line 77)
- Options: **Delete** (own posts only — already has RLS), **Report** (insert into new `reports` table), **Block** (insert into new `blocked_users` table)
- DB migration: create `reports` and `blocked_users` tables

### F-03: Change Password
- Replace `setTimeout` in `ManageAccount.tsx` with `supabase.auth.updateUser({ password: newPassword })`
- No edge function needed — Supabase auth client handles this directly

### F-04: Delete Account
- Create `account-delete` edge function that:
  - Soft-deletes: sets a `deleted_at` timestamp on profile, or
  - Uses service role to call `supabase.auth.admin.deleteUser(userId)` after verifying identity
- Wire the AlertDialog confirm in `ManageAccount.tsx`

### F-05: Contact Us form
- Create `contact-submit` edge function that inserts into a new `contact_messages` table
- Fields: `user_id`, `subject`, `message`, `created_at`
- Wire `ContactUs.tsx` `handleSubmit` to call the edge function

### F-06: Connect Music (persist toggles)
- Save toggle state to a new `user_music_connections` table (`user_id`, `service_id`, `connected boolean`)
- Read on mount, toggle on change. No real OAuth needed yet — just persist the preference

### F-07: Save/Interested button persistence
- DB migration: create `saved_events` table (`user_id`, `event_id`, `created_at`, unique constraint)
- Wire `handleInterested` in `EventDetail.tsx` to insert/delete from `saved_events`
- Fetch saved status on mount

### F-08: Map Preview on EventDetail
- Replace static MapPin placeholder with a Google Maps static image or embed
- Use the event's `location` text to construct a Google Maps embed URL
- No API key needed for basic embed (`maps.google.com/maps?q=...&output=embed`)

### F-10: Analytics on ManageEventModal
- The dashboard-analytics edge function already exists and returns revenue, attendees, tickets sold, views, conversion rate
- Enable the "Analytics" button in `ManageEventModal.tsx` (remove `disabled: true`)
- Create a simple `EventAnalytics` page/modal that calls `dashboard-analytics` with the specific event's organiser profile ID
- Show: revenue, ticket sales, attendee count, conversion rate

### F-12: Group chat creation
- Add a "New Chat" button on the Messages/Dashboard page
- Create a simple modal to name the chat and select members
- Insert into `group_chats` table (INSERT already allowed)
- Insert members into a new `group_chat_members` table or use the existing structure

---

## Batch 2 — Event Detail & RSVP Enhancements

### P-05: Add to Calendar
- Add a "Add to Calendar" button on `EventDetail.tsx`
- Generate `.ics` file content from event data (title, date, end_date, location, description)
- Trigger download as `.ics` file
- Pure frontend, no backend needed

### P-06: "Who's going" with friend highlights
- On the EventGuests page, fetch user's connections and cross-reference with attendees
- Show "X friends going" badge on `EventDetail.tsx` guest section
- Use existing `connections` table to find mutual attendees

### P-07: RSVP with +1 / guest count
- Add a `guest_count` column to `rsvps` table (default 1)
- Update the RSVP flow to allow selecting +1/+2 before submitting
- Update `rsvp_join` DB function to accept and store guest count
- Update capacity checks to account for guest counts

### P-10: Waitlist when full
- When capacity is reached, show "Join Waitlist" instead of "Sold Out"
- Create `waitlist` table (`user_id`, `event_id`, `position`, `created_at`)
- When a spot opens (RSVP cancelled), notify first waitlisted user

### P-19: "Going" friends shown on event cards
- In search results and feed event cards, query connections + rsvps to show "X friends going"
- Add a small avatar stack + count to `EventCard` component

---

## Batch 3 — Ticketing & Orders

### P-11: Order confirmation / success page
- Create `/checkout/success` page
- After Stripe redirect, parse `payment_intent` from URL params
- Fetch the confirmed order and display ticket details + QR code
- Add route to `App.tsx`

### P-12: View purchased tickets with QR codes
- Update `Tickets.tsx` to also fetch from `tickets` table for confirmed orders
- Show QR code (using existing `qrcode.react` dependency) from `tickets.qr_code`
- Add a ticket detail modal/page showing full QR, event info, tier name

### P-14: Transfer tickets
- Create `ticket-transfer` edge function
- Updates `tickets.user_id` to new owner, logs transfer in an audit table
- Add "Transfer" button on ticket detail view
- UI: search/select recipient by username

### P-15: Discount/promo code validation
- `discount_codes` table already exists with all necessary fields
- Create `validate-discount` edge function that checks code validity, returns discount amount
- Wire the discount code input in `PurchaseModal.tsx` to validate on blur/submit
- Apply discount in `orders-reserve` edge function

### P-28: Linked payment methods
- Create a Settings > Payment Methods page
- Use Stripe Customer portal or list saved payment methods via Stripe API
- Display cards on file, allow setting default
- Edge function to list/delete payment methods

---

## Batch 4 — Organiser Tools

### P-21: Revenue / sales dashboard
- The `dashboard-analytics` edge function already returns `total_revenue_cents` and `net_tickets_sold`
- Add a "Revenue" tab to `OrganiserDashboard.tsx` showing:
  - Total revenue, ticket sales breakdown by tier, sales over time chart
- Query `orders` table grouped by `ticket_tier_id` for breakdown

### P-23: Scheduled event publishing
- Add `scheduled_publish_at` column to `events` table
- When set, event `status` stays `draft` until that time
- Create a cron/scheduled edge function to publish events when time is reached
- Add date picker in CreateEvent details form

### P-24: Attendee email/SMS blast
- Create `event-blast` edge function
- Fetch all RSVPs for event, send notification to each
- UI: "Message Attendees" button in ManageEventModal
- Compose message modal, sends via the existing notification system

### P-25: Embed event widget
- Create a `/embed/:eventId` public route with minimal UI (no nav, no frame)
- Show event title, date, location, "Get Tickets" button linking to full page
- Add "Get Embed Code" button in ManageEventModal that copies an iframe snippet

---

## Batch 5 — Discovery & Social

### P-02: Location-based event discovery
- Add a `city` field to events (already exists as `location`)
- On Events/Search page, add a city/location filter dropdown
- Use profile's `city` to default the filter
- Filter events by matching location text

### P-03: Event recommendations / "For You"
- Create a simple recommendation algorithm:
  - Events by organisers the user follows
  - Events friends are going to
  - Events in same category as past RSVPs
- Add "For You" tab on Events page
- Edge function or client-side query joining followers + connections + rsvps

### P-18: Share event as post to feed
- Add "Share to Feed" button on EventDetail page
- Opens PostComposer pre-filled with the event attachment (`event_id`)
- PostComposer already supports `event_id` — just need the trigger flow

---

## Database Migrations Required

1. `reports` table: `id, reporter_id, reported_user_id, reported_post_id, reason, created_at`
2. `blocked_users` table: `id, blocker_id, blocked_id, created_at`
3. `contact_messages` table: `id, user_id, subject, message, created_at`
4. `user_music_connections` table: `id, user_id, service_id text, connected boolean, created_at`
5. `saved_events` table: `id, user_id uuid, event_id uuid, created_at` (unique on user_id + event_id)
6. `rsvps`: add `guest_count integer default 1`
7. `waitlist` table: `id, user_id, event_id, position integer, notified_at, created_at`
8. `events`: add `scheduled_publish_at timestamptz`
9. `group_chat_members` table (if not exists): `id, group_chat_id, user_id, joined_at`

## New Edge Functions Required

1. `account-delete` — soft/hard delete user account
2. `contact-submit` — store contact form messages
3. `validate-discount` — validate discount codes against DB
4. `ticket-transfer` — transfer ticket ownership
5. `event-blast` — send notifications to all event attendees

## New Pages/Routes Required

1. `/checkout/success` — order confirmation with QR
2. `/embed/:eventId` — embeddable event widget
3. `/events/:id/analytics` — event-level analytics (or modal)

---

## Recommended Implementation Order

**Start with Batch 1** (broken flows) — highest impact, lowest risk, fixes existing UI.  
**Then Batch 3** (ticketing) — completes the purchase flow end-to-end.  
**Then Batch 2** (event enhancements) — improves core event experience.  
**Then Batch 4** (organiser tools) — empowers event creators.  
**Then Batch 5** (discovery) — grows engagement.

Shall I proceed with Batch 1?

