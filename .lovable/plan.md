

## Problem

The search page (`src/pages/Events.tsx`) only queries the `profiles` table. Organiser profiles live in a separate `organiser_profiles` table, so "Members Only" will never appear in search results.

## Solution

Update the search page to query **both** `profiles` and `organiser_profiles`, merge the results, and distinguish them visually. When clicking an organiser result, navigate to the organiser profile page instead of a user profile page.

### Changes

1. **`src/pages/Events.tsx`** — Add a parallel query to `organiser_profiles` for both the "suggested" load and the debounced search. Merge results into a unified list with a `type` field (`"user"` or `"organiser"`). Route organiser results to `/organiser/:id` (or the appropriate organiser profile route) and user results to `/user/:userId` as before. Add a small badge or label to differentiate organiser profiles from personal profiles in the list.

2. **Result type** — Define a union type like:
   ```
   type SearchResult = {
     id: string;
     displayName: string | null;
     username: string | null;
     avatarUrl: string | null;
     type: "user" | "organiser";
   }
   ```
   Map `profiles` rows and `organiser_profiles` rows into this common shape.

3. **Visual differentiation** — Show a small "Organiser" badge or different icon next to organiser profile results so users can tell them apart.

### Technical Details

- The `organiser_profiles` table has RLS allowing all authenticated users to SELECT, so the query will work for logged-in users.
- For suggestions (on mount), fetch top 6 from each table and interleave them, or fetch 6 total split between both.
- For search, query both tables with `ilike` on `display_name` and `username`, then merge and deduplicate.
- Need to determine the correct route for viewing an organiser profile — will check existing routes.

