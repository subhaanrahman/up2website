

# Plan: Fix Post Attribution, Event Ordering, Dashboard Queries, Login Speed & Co-host Search

## Issues Identified

### 1. Posts display personal profile instead of organiser identity
**Root cause**: `usePostsQuery.ts` always fetches author profiles from `profiles` table using `author_id` (personal user). When a post has `organiser_profile_id`, it should display the organiser's name/avatar instead.

**Fix**: In `fetchPosts()`, after fetching posts, for any post with `organiser_profile_id`, fetch the organiser profile and use its `display_name`/`avatar_url` instead of the personal profile.

### 2. EventDetail shows personal avatar for organiser-hosted events
**Root cause**: `organiserHost` query fetches the organiser profile correctly and `displayHostAvatar` prioritizes it, but the organiser profile likely has `avatar_url: null`. The fallback shows the personal profile's avatar.

**Fix**: This is actually working correctly in code — the organiser profile just doesn't have an avatar uploaded. No code change needed here, but will verify.

### 3. Profile page events not filtered by organiser profile
**Root cause**: `Profile.tsx` line 45 calls `useHostEvents(user?.id)` which queries `host_id = user.id`. When viewing as an organiser, it should query by `organiser_profile_id` instead.

**Fix**: Add a new `useOrganiserEvents` hook or modify `Profile.tsx` to query events by `organiser_profile_id` when `isOrganiser` is true. Past and upcoming sorting should use descending order for past, ascending for upcoming.

### 4. Event ordering (upcoming = ascending, past = descending)
**Root cause**: `eventsRepository.getByHost()` uses `ascending: true` for all events. `OrganiserDashboard.tsx` uses `ascending: false`. Profile page sorts in JS but doesn't apply correct ordering.

**Fix**:
- Profile page `upcomingEvents`: sort ascending (soonest first)
- Profile page `pastEvents`: sort descending (most recent first)
- `OrganiserDashboard.tsx`: upcoming tab ascending, past tab descending

### 5. OrganiserDashboard not showing organiser events for Dylan
**Root cause**: When Dylan logs in as himself and switches to Members Only, `activeProfile.id` = `6348b9db` (Members Only). The dashboard queries `organiser_profile_id = activeProfile.id`. Dylan's "test" event has this set correctly. The other Members Only events have `host_id = e8f02149` (Haan) but `organiser_profile_id = 6348b9db`. RLS allows SELECT on public events, so these should be visible. Need to verify if the issue is that Dylan's session can actually see these rows.

**Fix**: Since all events are public and RLS allows `is_public = true`, the dashboard query should work. The real issue may be the query ordering — currently all `ascending: false`, but should split by tab.

### 6. Login phone check is slow (~5 seconds)
**Root cause**: Edge function logs show "Rate limit check failed: no unique or exclusion constraint matching the ON CONFLICT specification". The rate limit function is failing and falling through (fail-open), but it's adding latency. The `check_rate_limit` DB function does an `ON CONFLICT` upsert. Looking at the function, it calls with `p_user_id: null` and `p_ip_address: ip`, inserting into `rate_limits` with `user_id = NULL`. The unique indexes have `WHERE user_id IS NOT NULL` / `WHERE ip_address IS NOT NULL` partial filters. But when `user_id` is NULL and we're inserting with `ip_address`, the conflict target `(endpoint, ip_address, window_start)` should match the partial index. Wait — the DB function uses `ON CONFLICT (endpoint, user_id, window_start)` when `p_user_id IS NOT NULL`, and `ON CONFLICT (endpoint, ip_address, window_start)` when using IP. Let me re-read the function...

The `check_rate_limit` function has two branches: one for user_id, one for ip_address. When called with `p_user_id = null` and `p_ip_address = ip`, it goes to the IP branch and does `ON CONFLICT (endpoint, ip_address, window_start)`. There are multiple overlapping unique indexes on these columns. The error "no unique or exclusion constraint matching" suggests the ON CONFLICT clause can't determine which index to use because there are duplicate indexes.

**Fix**: Drop the duplicate indexes. Keep only `idx_rate_limits_endpoint_ip_window` and `idx_rate_limits_endpoint_user_window` (or the equivalent). There are currently 4 duplicate unique indexes for each combination. Also, the cold start of the edge function adds ~30ms which is minimal. The real latency is the failing RPC call + retry/error handling.

### 7. Co-host search with user lookup
**Root cause**: The co-host input in `CreateEvent.tsx` is just a text input. No search/autocomplete exists.

**Fix**: Add a debounced search that queries `profiles` table by `display_name` or `username`, prioritizing connected friends (from `connections` table where `status = 'accepted'`). Show results in a dropdown below the input.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/usePostsQuery.ts` | Fetch organiser profile data for posts with `organiser_profile_id` and use it for display name/avatar |
| `src/pages/Profile.tsx` | Query events by `organiser_profile_id` when in organiser mode; sort upcoming ascending, past descending |
| `src/components/OrganiserDashboard.tsx` | Sort upcoming ascending, past descending |
| `src/components/create-event/EventDetailsForm.tsx` | Add co-host user search with autocomplete dropdown |
| DB migration | Drop duplicate rate_limit indexes to fix the ON CONFLICT error causing slow login |

## Implementation Order
1. DB migration to fix rate_limit indexes (fixes login speed)
2. Fix post display for organiser profiles
3. Fix profile page event queries for organiser mode + ordering
4. Fix dashboard event ordering
5. Add co-host search functionality

