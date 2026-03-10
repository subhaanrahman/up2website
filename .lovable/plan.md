
Goal: Fix the Tickets “My Plans” ordering bug so past events stay at the bottom and “Last Month” is not incorrectly shown at the top.

Root cause found in current code:
- `src/pages/Tickets.tsx` → `getPastGroup()` currently does:
  - `if (isAfter(date, lastMonthStart)) return "last-month";`
- This is too broad. Any past date after last month’s start (including dates earlier this month) is labeled `"last-month"`.
- Result: recent past events can be mis-bucketed as “Last Month,” making that divider appear unexpectedly high.

What I will change:
1) Fix past-group classification boundaries in `getPastGroup()`:
- Use explicit range checks:
  - `"last-month"` only if `date >= lastMonthStart` AND `date < monthStart`
  - `"last-6-months"` only if `date >= sixMonthsAgo` AND `date < lastMonthStart`
  - otherwise `"older"`
- This prevents current-month past events from being mislabeled “Last Month.”

2) Keep the page section order exactly as requested:
- Top: Today
- Middle: Upcoming
- Bottom: Past
- This is already implemented in `renderPlansContent()` and will remain unchanged.

3) Preserve past visual chronology inside the past section:
- Keep existing past group rendering order (`[...PAST_GROUPS].reverse()`) so older buckets stay above newer past buckets near Today.
- Keep per-group past event sort descending (recent-to-older within each bucket).

Validation after change:
- Event from yesterday/earlier this month should no longer appear under “Last Month.”
- “Last Month” divider should only appear for events actually in previous calendar month.
- With mixed data, layout should remain: Today at top, Upcoming in middle, all Past content at bottom.

Files to update:
- `src/pages/Tickets.tsx` (only)
