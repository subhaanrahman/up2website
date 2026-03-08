

## Manage Event Flow — Full Plan

### Current State
The manage event flow currently has:
- **ManageEventModal** (gear icon popup): 3 items — "Orders, Guestlists & Refunds" (→ tabbed page), "Upload Media" (→ media section), "VIP Tables — Coming Soon" (disabled)
- **ManageEvent page** (`/events/:id/manage`): Tabs for Orders, Guestlist, Refunds + media upload section + VIP placeholder
- **EventCheckIn page** (`/events/:id/checkin`): Searchable attendee list with manual check-in toggles
- All accessible from OrganiserDashboard via pencil (edit), gear (manage), scan (check-in) icons

### What's Missing / Requested
The user wants a comprehensive manage event plan covering all subpages an event manager needs, including managing RSVP and ticket links. Here's what needs to be added or improved:

### Plan

#### 1. Expand ManageEventModal as the central hub
Add missing management actions to the modal popup:
- **Check-In** — link to existing `/events/:id/checkin` page (currently only accessible via scan icon, not from the modal)
- **Event Settings** — link to edit event page (`/events/:id/edit`)
- **Share / Ticket Links** — new item to copy shareable event link and ticket purchase link
- **Analytics** — placeholder/coming soon for per-event analytics

Updated modal items:
1. Orders, Guestlists & Refunds → `/events/:id/manage`
2. Check-In → `/events/:id/checkin`
3. Share & Ticket Links → inline action (copy link / show QR)
4. Upload Media → `/events/:id/manage` (media section)
5. Event Settings → `/events/:id/edit`
6. VIP Tables — Coming Soon (disabled)

#### 2. Add "Share & Ticket Links" functionality
New modal or bottom sheet triggered from the manage modal:
- Display the event's shareable URL (`/events/:id`)
- "Copy Link" button
- "Copy RSVP Link" button (direct link that auto-opens RSVP/purchase flow)
- QR code rendering of the event link using existing `qrcode.react` dependency
- No new backend needed — purely frontend

#### 3. Wire Check-In into the modal
Simply add a new item in `ManageEventModal` that navigates to `/events/:id/checkin`. No new pages needed since EventCheckIn already exists.

#### 4. Update BACKEND_TODO.md
Mark completed items (`event_media` table, `orders-list` edge function) and add new items for ticket link tracking / analytics.

### Files to modify
- `src/components/ManageEventModal.tsx` — add Check-In, Share & Ticket Links, Event Settings items
- Create `src/components/ShareEventLinksModal.tsx` — new component for copy link + QR code display
- `docs/BACKEND_TODO.md` — update completed items, add share/analytics todos

### Technical details
- Share links component uses `qrcode.react` (already installed) and `navigator.clipboard.writeText` for copy
- Event URL format: `${window.location.origin}/events/${eventId}`
- No database changes required
- No new edge functions required

