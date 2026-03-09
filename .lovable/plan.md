

## Root Cause

The recent profile tier migration changed `is_profile_public()` to only return `true` for `professional` profiles. The profiles RLS policy uses this function, meaning **personal profiles are now invisible to other authenticated users**. This is the single root cause of all three issues:

1. **Home feed showing "User - @user"** — when fetching post author profiles, the query can't read other users' personal profiles, so it falls back to null/defaults
2. **Friends list empty** — the friends page fetches friend profiles via `profiles` table, but RLS blocks access to personal-tier profiles
3. **Search returning no people results** — same RLS issue blocks profile search queries

## Fix

The `is_profile_public` function is too restrictive. Personal profiles should still be **visible** to other authenticated users (for search, feed, friend display). The privacy distinction should be about what *detailed info* is shown, not whether the profile row is readable at all.

### Step 1: Update `is_profile_public` database function

Replace the function to return `true` for all authenticated profile lookups. The original intent of "personal = private" should mean hiding sensitive data (events, activity) in the UI — not blocking the profile row from being read entirely.

```sql
CREATE OR REPLACE FUNCTION public.is_profile_public(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;
```

This restores the original behavior where all profiles are readable by authenticated users, which is correct — the profile row contains basic info (name, avatar, username) needed everywhere.

**Alternative approach (if we want tier-based visibility later):** Keep the function but update the RLS policy to always allow reading basic profile columns. However, Postgres RLS is row-level not column-level, so the simpler approach is to allow all authenticated reads and enforce visibility restrictions in the application layer (which is already done in `UserProfile.tsx`).

### Step 2: Verify the feed post queries

After the RLS fix, the `fetchPosts` function in `usePostsQuery.ts` should correctly resolve author profiles again. No code changes needed — the issue is purely at the database layer.

### Step 3: Verify friends and search

Similarly, `FriendsFollowing.tsx` and `Events.tsx` (search page) query `profiles` directly — both will work once RLS allows reading all profiles.

### Summary

- **1 database migration** — update `is_profile_public` to return `true` for all authenticated users
- **0 code changes** — all frontend code is correct; the bug is RLS blocking profile reads

### Technical Note

The privacy/visibility logic for profile *content* (events, activity) is already enforced in the UI layer (`UserProfile.tsx` checks tier and connection status). The database-level `is_profile_public` should not block reading the profile row itself, only gate what sensitive data is exposed — which is better handled at the application layer since Postgres doesn't support column-level RLS.

