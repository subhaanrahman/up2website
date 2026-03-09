## Plan: Feature Gaps & Stubbed Flows — All Batches

### ✅ Batch 1 — COMPLETED
- **F-01**: "Add" button on Suggested Friends → wired to `connections` table insert
- **F-02**: Feed Post "..." menu → DropdownMenu with Delete/Report/Block, using `reports` and `blocked_users` tables
- **F-03**: Change Password → `supabase.auth.updateUser()` 
- **F-04**: Delete Account → `account-delete` edge function with full data cleanup
- **F-05**: Contact Us form → inserts into `contact_messages` table
- **F-06**: Connect Music → persisted to `user_music_connections` table
- **F-07**: Save/Interested → persisted to `saved_events` table
- **F-08**: Map Preview → Google Maps embed iframe
- **F-10**: Analytics → enabled, new `/events/:id/analytics` page with revenue/tickets/attendees
- **F-12**: Group Chat creation → `CreateGroupChatModal` + `group_chat_members` table

### Batch 2 — Event Detail & RSVP Enhancements (NEXT)
- P-05: Add to Calendar (.ics download)
- P-06: "Who's going" friend highlights
- P-07: RSVP with +1 guest count
- P-10: Waitlist when full
- P-19: "Going" friends on event cards

### Batch 3 — Ticketing & Orders
- P-11: Order confirmation / success page
- P-12: View purchased tickets with QR codes
- P-14: Transfer tickets
- P-15: Discount code validation
- P-28: Linked payment methods

### Batch 4 — Organiser Tools
- P-21: Revenue / sales dashboard tab
- P-23: Scheduled event publishing
- P-24: Attendee blast notifications
- P-25: Embed event widget

### Batch 5 — Discovery & Social
- P-02: Location-based event discovery
- P-03: Event recommendations / "For You"
- P-18: Share event as post to feed
