

## Search Page Filter Redesign

**Current state**: Category-based pills (All, Party, Birthday, Dinner, Wedding, Social) that filter by event type.

**Proposed filters** — more practical, action-oriented filters that help users find events they actually want to attend:

| Filter | Logic |
|--------|-------|
| All | No filter (default) |
| This Week | `event_date` within current week |
| This Month | `event_date` within current month |
| Free | Events where all ticket tiers are free (price = 0) or no tickets exist |
| Nearby | Location-based (placeholder — uses city match for now) |
| Tonight | `event_date` is today |

**Changes needed:**

1. **`src/pages/Events.tsx`** — Replace `categories` array with new time/type filter options. Pass selected filter key to the query hook instead of category.

2. **`src/hooks/useEventsQuery.ts`** — Update `useSearchEvents` to accept a `filter` param (e.g. `thisWeek`, `thisMonth`, `tonight`, `free`) instead of just `category`.

3. **`src/features/events/repositories/eventsRepository.ts`** — Update `search()` method to apply date-range filters using `date-fns` helpers (`startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfToday`, `endOfToday`). For "Free", filter by joining or checking ticket pricing (or a simpler `is_free` flag if available on the events table).

4. **Desktop view** in `Events.tsx` gets the same filter pill updates.

