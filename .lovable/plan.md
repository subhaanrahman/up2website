

## Profile Metrics Rework

### Problem
1. **Event count** is currently just `hostEvents.length` for all profiles. It should be:
   - **Organiser/Venue profiles**: count of **past** events hosted by that organiser
   - **Personal/Promoter profiles**: combined count of personal events + events from all organiser accounts they're a member of (or own)

2. **Social count** currently shows "Friends" (from `connections` table with `status=accepted`) for personal profiles and "Attendees" for organisers. It should be:
   - **Organiser/Venue profiles**: show **Followers** count (new concept — users follow organisers)
   - **Personal profiles**: show combined **Friends / Following** count (friends from `connections` + organiser profiles they follow)

### Database Changes

**New table: `organiser_followers`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| organiser_profile_id | uuid | FK to organiser_profiles(id) ON DELETE CASCADE |
| user_id | uuid | The follower's auth user ID |
| created_at | timestamptz | default now() |

Unique constraint on `(organiser_profile_id, user_id)`.

RLS policies:
- Authenticated users can SELECT all rows (public follower counts)
- Users can INSERT/DELETE their own rows (`user_id = auth.uid()`)

**New database functions:**

1. `get_organiser_follower_count(p_organiser_profile_id uuid)` — counts rows in `organiser_followers` for that organiser. Replaces the current "Attendees" metric for organiser profiles.

2. `get_organiser_past_event_count(p_organiser_profile_id uuid)` — counts events where `organiser_profile_id` matches AND `event_date < now()`.

3. `get_personal_combined_event_count(p_user_id uuid)` — counts:
   - Events where `host_id = p_user_id` AND `event_date < now()` (personal events)
   - Events where `organiser_profile_id` is in any organiser profile the user owns OR is an accepted member of, AND `event_date < now()`
   - Returns distinct count to avoid double-counting.

4. `get_friends_and_following_count(p_user_id uuid)` — returns sum of:
   - Accepted connections count (existing `get_friend_count` logic)
   - Organiser profiles the user follows (`organiser_followers` where `user_id = p_user_id`)

### UI Changes

**`src/pages/Profile.tsx`:**
- Replace `friendCount` query with new `get_friends_and_following_count` RPC call; label changes to "Friends / Following"
- Replace `attendeeCount` query with new `get_organiser_follower_count` RPC call; label changes to "Followers"
- Replace `eventsCount = hostEvents?.length` with appropriate RPC call:
  - Organiser active → `get_organiser_past_event_count`
  - Personal active → `get_personal_combined_event_count`

**`src/pages/UserProfile.tsx`:**
- Apply the same logic when viewing other users' profiles (use correct RPC based on whether the viewed profile is an organiser or personal)

### File Changes Summary
| File | Change |
|---|---|
| Migration SQL | Create `organiser_followers` table, RLS, and 4 new DB functions |
| `src/pages/Profile.tsx` | Update queries and labels for events count and social count |
| `src/pages/UserProfile.tsx` | Update metrics display for viewed profiles |

