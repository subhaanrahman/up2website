# Haan (Subhaan Rahman) — Handover Notes

## 13 March 2026

- **Comprehensive docs update**: Full review and update of all docs/ files — ARCHITECTURE.md, DATABASE_ARCHITECTURE.md (new), BACKEND_TODO.md, API_CHECKLIST.md, DB_OPTIMISATION_CHECKLIST.md, GAMIFICATION_OPTIONS.md, OPTIMISE_CHECKLIST.md, SECURITY_CHECKLIST.md, STRIPE_TODO.md. Deleted stale CHANGELOG_2026-03-03.md.
- **Event Board (attendee chat)**: Added Partiful-style message board to event detail pages. Uses `event_messages` table with realtime enabled. Access restricted to RSVP'd users, ticket holders, or host. Component: `EventBoard.tsx`.
- **Build error identified**: `Dashboard.tsx` calls `supabase.rpc("get_user_group_chats")` but this RPC doesn't exist in the database. Needs to be created.

## 7 March 2026

### Summary of Changes

- **Login performance: `signInWithPassword` migration** — Replaced the 5-step magic-link login chain (profile lookup → getUserById → verifyPassword → generateLink → verifyOtp) with phone-based `signInWithPassword` (single call after password verification). Existing users are lazily migrated on first login. Both `login` and `register` edge functions updated.
- **Rate limiting fixed** — Added missing partial unique indexes on `rate_limits` table for `(endpoint, user_id, window_start)` and `(endpoint, ip_address, window_start)`. Updated `check_rate_limit` DB function to include matching WHERE clauses. Fixes the `ON CONFLICT` errors logged on every auth call.
- **Optimisation checklist created** — See `docs/OPTIMISE_CHECKLIST.md` for full platform optimisation backlog

### Deferred for Haan
- **Merge check-phone + login flow** — Currently the PhoneStep calls `checkPhone` (edge function), then PasswordStep calls `login` which re-does the phone lookup. Could combine into a single call or show password field inline for returning users. This is a UX/front-end change that needs Haan's input on the desired flow.

## 6 March 2026

### Summary of Changes

- **Rewards UI hidden, QR code modal added**: Removed `RewardsModal` and `AvatarWithProgress` from Profile page; clicking the profile avatar now opens a `ProfileQrModal` showing the user's QR code (via `qrcode.react`), avatar, name, username, and a copy-link button. Gamification backend (tables, hooks, provider) remains intact for future re-enablement.
- **Feed post first-name only**: `FeedPost` header now shows only the author's first name instead of the full display name
- **Feed post header inline layout**: Name, verified badge, @username, and timestamp all render on a single line with consistent `text-[15px]` sizing

- **Like & repost counters**: Wired `usePostInteractions` into `FeedPost.tsx` to show live like/repost counts next to icons, filled red heart when liked, green repost icon when reposted
- **Repost-to-feed**: Updated `usePostsQuery` to fetch `post_reposts` joined with original posts, merge into feed sorted by time with "🔁 {name} reposted" banner
- **FeedPost props**: Added `postId` and `repostedBy` props to `FeedPost`; passed from `Index.tsx`, `Profile.tsx`, and `UserProfile.tsx`
- **Post interaction RLS fix**: Replaced restrictive RLS policies on `post_likes` and `post_reposts` with permissive ones so likes/reposts actually persist
- **Logo snake-slide animation**: Added custom `snakeSlide` keyframe in `tailwind.config.ts` (skew, scale, blur); applied to header logo in `Index.tsx` for smooth entrance on page load

## 5 March 2026

### Summary of Changes

- **Database seeding**: Inserted 20 user profiles and 8 organiser profiles with realistic South African data (names, bios, cities, avatar URLs via `i.pravatar.cc`)
- **Auth users**: Created corresponding `auth.users` entries to satisfy foreign key constraints on `profiles` table
- **Organiser profiles seeded**: Bassline Collective, The Rooftop Social, Vibe Republic, Cape Town Sunset Sessions, Durban Beats, Stellenbosch Socials, Jozi Nights, The Garden Collective
- **Profile edit sync fix**: Added `useEffect` in `ActiveProfileContext.tsx` to auto-sync `activeProfile` state when organiser profile data changes after a refetch
- **Profile heading fix**: Changed `Profile.tsx` heading from `{username}` to `{displayName || username}`
- **Auth flow UX improvement**: Refactored `PhoneStep` to navigate to the OTP/password step instantly — OTP send fires in background (fire-and-forget) so users see the code input page immediately instead of hanging on "Checking..."
