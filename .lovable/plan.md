

# High Priority Missing Features

## 1. Event Discovery & Browse Page
The current `/search` page only searches people/organisers. It needs event search and browsing capabilities.

**Changes:**
- **`src/pages/Events.tsx`**: Add an "Events" tab alongside the existing people search. Include category filter pills (Party, Birthday, Dinner, etc.), date filtering, and event card results. Query the `events` table with filters (category, date range, title search via `ilike`). Render results using a compact event card format (cover image, title, date, location).
- **`src/hooks/useEventsQuery.ts`**: Add a `useSearchEvents` hook that accepts search query, category, and date filters.
- Reuse existing `eventsRepository.list()` pattern but extend with text search support.

## 2. Edit Event Page
Events can be created but not edited. Need `/events/:id/edit` route and an edit form.

**Changes:**
- **`src/pages/EditEvent.tsx`** (new): Clone the `CreateEvent` form structure, pre-fill with existing event data via `useEvent(id)`. On submit, call a new `events-update` edge function. Add a "Cancel Event" / "Delete Event" button at the bottom.
- **`supabase/functions/events-update/index.ts`** (new): Edge function that validates auth (must be host), validates input, and runs `UPDATE` on the `events` table. Support a `delete` action that runs `DELETE` instead.
- **`src/api/index.ts`**: Add `eventsApi.update()` and `eventsApi.delete()` methods.
- **`src/hooks/useEventsQuery.ts`**: Add `useUpdateEvent` and `useDeleteEvent` mutation hooks.
- **`src/App.tsx`**: Add route `/events/:id/edit` pointing to `EditEvent`.
- **`src/pages/EventDetail.tsx`**: Add an "Edit" button visible only when the logged-in user is the event host.

## 3. Guest List & RSVP Management
No way to view attendees or manage RSVPs.

**Changes:**
- **`src/pages/EventGuests.tsx`** (new): Page at `/events/:id/guests` showing attendee list. Query `rsvps` joined with `profiles` for the given event. Show avatar, name, RSVP status. If the current user is the host, show approve/decline buttons for pending RSVPs.
- **RLS policy update**: The current `rsvps` SELECT policy only allows host and the RSVP owner to see RSVPs. Add a policy allowing attendees of public events to view the guest list (users with an accepted RSVP on the same event can see other RSVPs).
- **`src/App.tsx`**: Add route `/events/:id/guests`.
- **`src/pages/EventDetail.tsx`**: Add a "Guest List" / "See who's going" link that navigates to `/events/:id/guests`. Show attendee count from RSVP data.
- **RSVP status update edge function**: Extend the existing `rsvp` edge function or add host actions to approve/decline RSVPs (update status). The host should be able to update any RSVP for their event.

### Database Changes
- **Migration**: Add RLS policy on `rsvps` for public event attendee visibility:
  ```sql
  CREATE POLICY "Attendees of public events can view guest list"
  ON public.rsvps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = rsvps.event_id 
      AND events.is_public = true
    )
  );
  ```

### New Files
| File | Purpose |
|------|---------|
| `src/pages/EditEvent.tsx` | Edit event form with delete capability |
| `src/pages/EventGuests.tsx` | Guest list with host RSVP management |
| `supabase/functions/events-update/index.ts` | Update/delete event edge function |

### Modified Files
| File | Change |
|------|--------|
| `src/pages/Events.tsx` | Add events tab with category/date filters |
| `src/pages/EventDetail.tsx` | Add Edit button (host only) + Guest list link |
| `src/App.tsx` | Add 2 new routes |
| `src/api/index.ts` | Add update/delete event API methods |
| `src/hooks/useEventsQuery.ts` | Add search, update, delete hooks |
| `src/features/events/repositories/eventsRepository.ts` | Add text search support |

