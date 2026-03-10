

# Event Board — Partiful-style Attendee Chat

## Overview
Add a message board to each event page, visible only to users on the guestlist (RSVP'd "going") or who have a ticket. This uses the existing `event_messages` table which already has correct RLS policies restricting reads and writes to attendees and the host.

## What exists
- **`event_messages` table** — already created with columns: `id`, `event_id`, `user_id`, `content`, `created_at`
- **RLS policies** — already restrict SELECT and INSERT to users who have an RSVP or are the event host
- **Realtime** — `event_messages` is not yet added to the realtime publication

## Plan

### 1. Database: Enable realtime on event_messages
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages;
```

### 2. New Component: `EventBoard.tsx`
- Accepts `eventId` prop
- Queries `event_messages` joined with `profiles` (for sender name/avatar) ordered by `created_at desc`
- Displays messages in a scrollable feed (newest first)
- Input bar at the bottom for composing a new message
- Realtime subscription for live updates via `postgres_changes`
- Each message shows: avatar, display name, time ago, content

### 3. Update `EventDetail.tsx`
- Show the `EventBoard` component **only** when:
  - User has an RSVP (`userRsvp` exists), OR
  - User is the host (`isHost`), OR
  - User has a ticket (query `tickets` table for this event + user)
- Place it between the "Guests" section and the "Add to Calendar" button
- Section header: "Event Board" with a `MessageSquare` icon
- Collapsed by default with a "View Board" button that expands it

### 4. Ticket holder check
- Add a small query to check if the user has a valid ticket for this event (`tickets` table, `status = 'valid'`)
- Combine with existing `userRsvp` and `isHost` to determine board access

### 5. Visual Design
- Card-style container matching existing event detail sections
- Messages styled like the group chat bubbles but in a flat feed layout (all left-aligned, like a comment section)
- Composer: simple text input + send button at the bottom of the board

