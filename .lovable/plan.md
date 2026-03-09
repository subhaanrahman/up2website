

## Plan: Unify Check-in Around User QR Code (Profile-Based)

### Current State
- Each purchased ticket has its own `qr_code` field with a unique value
- The Tickets page shows per-ticket QR codes via `TicketDetailModal`
- For non-purchased (RSVP) events, clicking QR opens the profile QR modal
- The check-in page (`EventCheckIn`) works by looking up users manually from an attendee list
- The `checkin-toggle` edge function checks in by `user_id`, not by ticket QR — so the backend already supports this model

### What Changes

**Concept**: A user's QR code is their profile URL (`/user/{user_id}`). Scanning it at any event looks up that user's tickets/RSVPs for the current event and checks them in. No per-ticket QR codes needed.

### Changes

**1. Tickets page — always show profile QR, not ticket QR**
- `src/pages/Tickets.tsx`: Remove the `handleQrClick` branching logic that opens `TicketDetailModal` for purchased tickets. Always open `ProfileQrModal` when the QR button is tapped.
- Remove `TicketDetailModal` import and usage from Tickets page (keep the component file — it may still be useful for ticket transfer flows later).
- Remove the `purchasedTickets` query since it's no longer needed for QR display on this page.

**2. TicketEventCard — show QR for all upcoming events (not just purchased/going)**
- `src/components/TicketEventCard.tsx`: Show the QR button for all non-past events regardless of ticket status (the user's profile QR is universal).

**3. EventCheckIn — add QR scan mode that resolves user from profile URL**
- `src/pages/EventCheckIn.tsx`: The "QR Scan Mode" button is currently disabled. We won't build a native camera scanner (not possible in this stack), but we will add a **manual lookup field** where the organiser can paste/enter a user ID or profile URL, which then finds and checks in that user.
- Add a text input mode behind the "QR Scan Mode" button that accepts a profile URL or user ID, extracts the user_id, and calls `checkin-toggle`.

**4. No database changes needed**
- The `check_ins` table already keys on `(event_id, user_id)` — no per-ticket reference needed.
- The `checkin-toggle` edge function already accepts `user_id` + `event_id`.

### Files to modify
- `src/pages/Tickets.tsx` — simplify QR to always use ProfileQrModal
- `src/components/TicketEventCard.tsx` — show QR for all non-past statuses
- `src/pages/EventCheckIn.tsx` — add manual user ID/URL lookup for check-in
- `src/components/TicketDetailModal.tsx` — no changes (keep for future transfer use)

