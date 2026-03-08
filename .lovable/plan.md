

## Diagnosis

### Issue 1: Likes and reposts don't persist
The RLS policies on `post_likes` and `post_reposts` are all **RESTRICTIVE** (`Permissive: No`). In Postgres, restrictive policies require at least one **PERMISSIVE** policy to also exist and pass. Since there are zero permissive policies on these tables, all operations (SELECT, INSERT, DELETE) are silently denied, even though the policy expressions themselves look correct.

The optimistic UI update in `usePostInteractions` makes it look like the action worked, but the actual database write fails silently (the Supabase client returns an error that isn't being checked), and `onSettled` re-fetches the real state, reverting the UI.

**Fix:** Drop the restrictive policies and recreate them as permissive (the default).

### Issue 2: Reposts don't appear in the feed immediately
When a user reposts, `toggleRepost` only invalidates `["post-interactions", postId]` but does not invalidate the feed query `["feed-posts"]`. The realtime subscription should catch it eventually, but there's also a code issue: `usePostInteractions` doesn't check for Supabase errors on insert/delete, so failures are swallowed.

**Fix:** After a successful repost toggle, also invalidate `["feed-posts"]` so the reposted content appears in the home feed immediately.

---

## Plan

### 1. Fix RLS policies on `post_likes` and `post_reposts`
Run a migration to drop the 6 restrictive policies and recreate them as **permissive** policies with the same expressions:

- `post_likes`: SELECT (true), INSERT (auth.uid() = user_id), DELETE (auth.uid() = user_id)
- `post_reposts`: SELECT (true), INSERT (auth.uid() = user_id), DELETE (auth.uid() = user_id)

### 2. Add error handling to `usePostInteractions`
In the `mutationFn` for both `toggleLike` and `toggleRepost`, check the Supabase response for errors and throw if present. This ensures `onError` properly rolls back optimistic updates.

### 3. Invalidate feed on repost toggle
In `toggleRepost.onSettled`, also invalidate `["feed-posts"]` so the reposted post appears on the home feed immediately without waiting for the realtime subscription.

### Technical details

**Migration SQL:**
```sql
-- Fix post_likes: drop restrictive, create permissive
DROP POLICY "Authenticated can view likes" ON post_likes;
DROP POLICY "Users can like posts" ON post_likes;
DROP POLICY "Users can unlike posts" ON post_likes;

CREATE POLICY "Authenticated can view likes" ON post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix post_reposts: drop restrictive, create permissive
DROP POLICY "Authenticated can view reposts" ON post_reposts;
DROP POLICY "Users can repost" ON post_reposts;
DROP POLICY "Users can unrepost" ON post_reposts;

CREATE POLICY "Authenticated can view reposts" ON post_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can repost" ON post_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost" ON post_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

**usePostInteractions.ts changes:**
- Add `.throwOnError()` or check `error` on insert/delete calls
- In `toggleRepost.onSettled`, add `queryClient.invalidateQueries({ queryKey: ["feed-posts"] })`

### Files to modify
- Database migration (RLS policy fix)
- `src/hooks/usePostInteractions.ts` (error handling + feed invalidation)

