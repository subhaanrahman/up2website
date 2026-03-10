

## Fix: Tickets page sort order — most recent to oldest

### Problem
Past plans are sorted ascending (oldest first) instead of descending (most recent first). Past events in "My Plans" show the very first event at the top instead of the most recently passed one.

### Changes

**`src/pages/Tickets.tsx`**

1. **Line 157** — Reverse past plans sort to descending (most recent past event first):
   - Change `new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()` → `new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()`

2. **Line 161** — Keep upcoming plans ascending (soonest first) — already correct, no change needed.

3. **Lines ~280-282** — Reverse the past group render order: currently renders `[...PAST_GROUPS].reverse()` which shows "older" first. Change to render `PAST_GROUPS` in natural order (last-month → last-6-months → older) so most recent past events appear at top.

4. **Line 173** — Keep upcoming created events ascending — already correct.

5. **Line 176-177** — Past created events are already sorted descending — already correct.

This is a one-line sort fix plus adjusting the group render order for past plans.

