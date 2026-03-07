

# Plan: Fix Profile Switching, Event Ownership & Past Event Handling

## Problems Identified

1. **Profile switching is cosmetic only** — The `ActiveProfileContext` just swaps a localStorage value. The auth session always stays as the personal user. So when creating events or posts, `host_id` and `author_id` are always set to the personal user's ID, not the organiser profile.

2. **Events not linked to organiser profile** — The `events-create` edge function ignores `organiser_profile_id` entirely. It hardcodes `host_id: user.id` and the client doesn't send `organiser_profile_id`.

3. **Posts from organiser account use personal user ID** — `PostComposer` passes `organiser_profile_id` to the insert, but `author_id` is always `user.id`. This is actually correct by design (author is the user), but the display should show the organiser identity when `organiser_profile_id` is set.

4. **Past events allow RSVP** — `EventDetail.tsx` shows the RSVP/Buy Tickets bar regardless of whether the event date has passed.

5. **Past events shown as "Upcoming"** — The Tickets page doesn't filter by date properly, and the OrganiserDashboard doesn't have tabs to toggle between upcoming/past.

6. **OrganiserDashboard doesn't show events** — It queries `events.organiser_profile_id` but the create flow never sets that field.

## Plan

### 1. Pass `organiser_profile_id` when creating events
- **Client** (`src/api/index.ts`): Add `organiser_profile_id` to the `create` body from `CreateEventInput`.
- **Type** (`src/features/events/domain/types.ts`): Add optional `organiserProfileId` to `CreateEventInput`.
- **Edge Function** (`supabase/functions/events-create/index.ts`): Accept `organiser_profile_id` from body, validate the user owns or is a member of that organiser profile, and insert it.
- **CreateEvent page** (`src/pages/CreateEvent.tsx`): Send the active organiser profile ID (or first available) when submitting.

### 2. Display organiser identity on events
- **EventDetail.tsx**: When a DB event has `organiser_profile_id`, fetch and display the organiser profile as host instead of the personal profile. The "Hosted by" section should link to the organiser profile.
- **OrganiserDashboard**: Events will now have `organiser_profile_id` set, so the existing query will work.

### 3. Block RSVP on past events
- **EventDetail.tsx**: Check if `event_date` is in the past. If so, replace the RSVP/Buy Tickets footer bar with a "This event has ended" message. Disable the RSVP button.

### 4. Add Upcoming/Past tabs to OrganiserDashboard
- **OrganiserDashboard.tsx**: Add a tab toggle (Upcoming | Past) between the "Events" header and the event list. Filter the `filteredEvents` array by date accordingly.

### 5. Fix post display for organiser profiles
- Posts with `organiser_profile_id` should display the organiser name/avatar rather than the personal profile. The `FeedPost` component likely already handles this if the data is fetched — will verify and fix if needed.

### 6. Fix flickering on reload
- The `ActiveProfileContext` loads from localStorage before validating against fetched organiser profiles. Add a sync check: if the stored profile is an organiser, wait for organiser profiles to load before confirming. Don't render children until resolved.

## Files to Modify

| File | Change |
|------|--------|
| `src/features/events/domain/types.ts` | Add `organiserProfileId` to `CreateEventInput` |
| `src/api/index.ts` | Pass `organiser_profile_id` in create call |
| `supabase/functions/events-create/index.ts` | Accept and insert `organiser_profile_id`, validate ownership |
| `src/pages/CreateEvent.tsx` | Send active organiser profile ID on submit |
| `src/pages/EventDetail.tsx` | Block RSVP for past events; show organiser as host when applicable |
| `src/components/OrganiserDashboard.tsx` | Add Upcoming/Past tab filter |
| `src/contexts/ActiveProfileContext.tsx` | Fix flicker by gating render on profile validation |

