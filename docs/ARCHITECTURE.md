# Up2 Platform — Architecture Overview

> Last updated: 2026-03-13  
> Status: Codebase-grounded reference. Every claim references actual files.

---

## 1. Frontend Architecture

### Tech Stack
React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix primitives).  
Server state: `@tanstack/react-query`. Routing: `react-router-dom` v6. Payments: `@stripe/react-stripe-js`.

### Key Pages (~47 routes in `src/App.tsx`)

| Page | Route | Purpose |
|------|-------|---------|
| `Index` | `/` | Home feed (personalized or public), post composer, nearby events, suggested friends |
| `Events` | `/search` | Event discovery with search, filters, categories, city |
| `EventDetail` | `/events/:id`, `/search/:id` | Full event view, RSVP, ticket purchase, **Event Board** (attendee chat) |
| `Tickets` | `/events` | "My Plans" (RSVP/purchased/saved) + "My Events" (created). Organiser profiles see `OrganiserDashboard` instead |
| `Dashboard` | `/messages` | Messaging hub: group chats, organiser DMs, broadcast (coming soon) |
| `Profile` | `/profile` | Active profile view (personal or organiser), posts feed, stats |
| `UserProfile` | `/user/:userId` | Other user's profile with friend/follow actions |
| `CreateEvent` | `/create` | Multi-step event creation with ticketing, guestlist, notifications panels |
| `EditEvent` | `/events/:id/edit` | Event editing (host-only) |
| `ManageEvent` | `/events/:id/manage` | Orders, guestlist CSV, refunds, attendee broadcast |
| `EventCheckIn` | `/events/:id/checkin` | Attendee list with manual toggle + QR scan mode |
| `EventAnalytics` | `/events/:id/analytics` | Event-level analytics |
| `EventGuests` | `/events/:id/guests` | Public guest list view |
| `Checkout` | `/checkout` | Stripe Elements payment form |
| `CheckoutSuccess` | `/checkout/success` | Post-payment confirmation |
| `Auth` | `/auth` | Phone → OTP → Password/Register flow |
| `Settings` | `/settings/*` | Notifications, privacy, help, about, account, music, contact, email verification, payment methods, blocked users |
| `CreateOrganiserProfile` | `/profile/create-organiser` | Organiser profile creation |
| `EditOrganiserProfile` | `/profile/edit-organiser` | Organiser profile editing |
| `OrganiserTeam` | `/profile/organiser-team` | Team member management |
| `FriendsFollowing` | `/profile/friends` | Friends list |
| `MessageThread` | `/messages/:id` | Group chat thread |
| `DmThread` | `/messages/dm/:id` | Direct message thread (user ↔ organiser) |
| `EventEmbed` | `/embed/:id` | Embeddable event widget for external sites |
| `BlockedUsers` | `/settings/blocked-users` | Manage blocked users |
| `MusicCallback` | `/settings/music/callback` | OAuth callback for music service integrations |

### Route Protection
- `<ProtectedRoute>` wraps all authenticated routes, redirects to `/auth` with return URL.
- Public routes: `/`, `/auth`, `/search`, `/search/:id`, `/user/:userId`, `/terms`, `/privacy`, `/events/:id`, `/embed/:id`, `/events/:id/guests`.

### Contexts / Providers (wrap order in `App.tsx`)

```
QueryClientProvider (staleTime: 30s, refetchOnWindowFocus: false)
  └── AuthProvider           (src/contexts/AuthContext.tsx)
       └── ActiveProfileProvider (src/contexts/ActiveProfileContext.tsx)
            └── GamificationProvider (src/hooks/useGamification.tsx)
                 └── TooltipProvider → Router → PhoneFrame → Routes
```

| Context | File | Owns |
|---------|------|------|
| **AuthProvider** | `src/contexts/AuthContext.tsx` | `user`, `session`, `loading`, auth methods: `checkPhone`, `sendOtp`, `verifyOtp`, `register`, `login`, `signOut`, `devLogin` |
| **ActiveProfileProvider** | `src/contexts/ActiveProfileContext.tsx` | `activeProfile` (personal or organiser), `switchProfile`, `organiserProfiles[]`, `isOrganiser`, `refetchOrganiserProfiles` |
| **GamificationProvider** | `src/hooks/useGamification.tsx` | `points`, `rank`, `vouchers`, `transactions`, `awardPoints()`, `refreshData()` |

### Major Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useProfile` / `useUpdateProfile` / `useUploadAvatar` | `src/hooks/useProfileQuery.ts` | Identity reads/writes |
| `useEvents` / `useSearchEvents` / `useEvent` | `src/hooks/useEventsQuery.ts` | Event listing, search, detail |
| `useCreateEvent` / `useUpdateEvent` / `useDeleteEvent` | `src/hooks/useEventsQuery.ts` | Event mutations via API |
| `useRsvpJoin` / `useRsvpLeave` | `src/hooks/useEventsQuery.ts` | RSVP mutations via API |
| `usePaginatedFeed` / `useFeedContext` / `useNearbyEvents` | `src/hooks/useFeedQuery.ts` | v1 personalized infinite feed |
| `useFeedPosts` / `useUserPosts` / `useOrganiserPosts` / `useUserFeedWithReposts` | `src/hooks/usePostsQuery.ts` | Legacy/profile-level post queries |
| `useUserPlannedEvents` / `useUserCreatedEvents` | `src/hooks/useUserEventsQuery.ts` | Tickets page data |
| `useForYouEvents` | `src/hooks/useForYouEvents.ts` | "For You" event recommendations (city, friends, followed orgs) |
| `useOrderFlow` | `src/hooks/useOrderFlow.ts` | Reserve → PaymentIntent → checkout state machine |
| `usePostInteractions` | `src/hooks/usePostInteractions.ts` | Like, repost, delete actions |
| `useLoyaltyQuery` | `src/hooks/useLoyaltyQuery.ts` | Points/vouchers/transactions |
| `useNotificationsQuery` | `src/hooks/useNotificationsQuery.ts` | Notifications list, unread count, mark read |
| `useNotificationSettings` / `usePrivacySettings` | `src/hooks/useNotificationSettings.ts`, `usePrivacySettings.ts` | Settings CRUD |
| `useDashboardAnalytics` | `src/hooks/useDashboardAnalytics.ts` | Organiser analytics |
| `useTicketTiers` | `src/hooks/useTicketTiers.ts` | Event ticket tier management |
| `useFriendsGoing` | `src/hooks/useFriendsGoing.ts` | Friends attending a specific event |
| `useStripeConnectStatus` | `src/hooks/useStripeConnectStatus.ts` | Organiser Stripe onboarding status |
| `useAdminMutations` | `src/hooks/useAdminMutations.ts` | Admin moderation actions |
| `useUnreadMessages` | `src/hooks/useUnreadMessages.ts` | Unread message count for messaging badge |

### Active Profile Switching
Lives in `src/contexts/ActiveProfileContext.tsx`. Triggered by long-press on profile tab. Persisted in `localStorage` under `active_profile`. On init: fetches owned organiser profiles AND accepted team memberships in parallel, then restores or defaults to personal. Syncs metadata (name/avatar) when org profile data changes.

### Feed Rendering
- **Home feed** (`src/pages/Index.tsx`): Uses `usePaginatedFeed()` from `src/hooks/useFeedQuery.ts` → calls `fetchFeedPage()` from `src/features/social/services/feedService.ts`.
- **Infinite scroll**: `IntersectionObserver` on a sentinel div with 200px rootMargin.
- **Realtime**: Supabase channel on `posts` and `post_reposts` tables invalidates `['feed-posts']` query key.
- **Profile feed** (`src/pages/Profile.tsx`): Uses `useUserFeedWithReposts()` from `src/hooks/usePostsQuery.ts` — separate, non-paginated path (limit 50).

### Event Board (Attendee Chat)
- **Component**: `src/components/EventBoard.tsx` — real-time message board on event detail pages.
- **Access**: Visible only to users who are RSVP'd ("going"), have a valid ticket, or are the event host.
- **Data**: Uses `event_messages` table with realtime subscription via `postgres_changes`.
- **RLS**: Messages viewable/postable only by attendees (RSVP'd) or the event host.

### Events & Checkout Flow
1. `EventDetail` → User selects ticket tier → navigates to `/checkout` with state (`eventId`, `tierId`, `quantity`, etc.)
2. `Checkout` (`src/pages/Checkout.tsx`) → calls `useOrderFlow().reserve()` → `orders-reserve` edge function → gets `order_id` + `amount_cents`
3. Then calls `useOrderFlow().createPaymentIntent()` → `payments-intent` edge function → gets `client_secret`
4. Renders `<Elements>` with Stripe `<PaymentElement>` → `stripe.confirmPayment()` → redirects to `/checkout/success`
5. Webhook (`stripe-webhook`) processes `payment_intent.succeeded` → confirms order, issues tickets, auto-RSVPs, awards loyalty points.

---

## 2. Backend Architecture

### Supabase Tables (46 tables)

**Core Identity**
- `profiles` — Personal user profiles (linked to auth.users via user_id)
- `organiser_profiles` — Business/organiser entities (owner_id → user)
- `organiser_members` — Team membership (role, status, invited_by)
- `organiser_followers` — User follows for organisers
- `user_roles` — Admin roles (super_admin, moderator, support)
- `user_music_connections` — Music service integrations
- `privacy_settings` — Per-user privacy controls
- `notification_settings` — Per-user notification preferences

**Social**
- `connections` — Friend request/accept (requester_id, addressee_id, status)
- `blocked_users` — User blocks
- `posts` — Feed posts (content, image_url, gif_url, event_id, organiser_profile_id)
- `post_likes` — Reactions with reaction_type
- `post_reposts` — Repost records
- `post_collaborators` — Post co-authors

**Events**
- `events` — Event listings (host_id, organiser_profile_id, status, capacity, guestlist, scheduling)
- `event_cohosts` — Co-host assignments
- `event_media` — Additional media files
- `event_messages` — Event attendee chat (realtime enabled)
- `event_reminders` — Configurable reminder types
- `rsvps` — RSVP records with guest_count
- `saved_events` — Bookmarked events
- `waitlist` — Capacity overflow
- `invites` — Event invitations

**Ticketing & Payments**
- `ticket_tiers` — Pricing tiers per event
- `tickets` — Issued tickets with QR codes
- `orders` — Order records with Stripe integration, 15-min expiry
- `discount_codes` — Per-event discount codes
- `organiser_stripe_accounts` — Stripe Connect account linkage
- `payment_events` — Stripe webhook audit log
- `refunds` — Refund tracking

**Loyalty**
- `user_points` — Points balance and rank
- `point_transactions` — Point earning history
- `user_vouchers` — Reward vouchers
- `user_badges` — Achievement badges

**Messaging**
- `dm_threads` — DM threads (user ↔ organiser)
- `dm_messages` — DM content
- `group_chats` — Group chat rooms
- `group_chat_members` — Group membership
- `group_chat_messages` — Group messages

**Admin & Moderation**
- `reports` — Content/user reports
- `moderation_actions` — Admin action audit log (no client writes)
- `support_requests` — Help desk tickets
- `contact_messages` — Contact form submissions

**Infrastructure**
- `rate_limits` — API rate limiting
- `check_ins` — Event check-in records
- `notifications` — In-app notifications with 20-day expiry

### Realtime-Enabled Tables
- `posts` — Feed live updates
- `post_reposts` — Repost live updates
- `event_messages` — Event board live chat
- `notifications` — Notification badge updates
- `user_points` — Loyalty points live sync

### Edge Functions (40 endpoints in `supabase/functions/`)

| Category | Functions |
|----------|-----------|
| **Auth** | `check-phone`, `send-otp`, `verify-otp`, `login`, `register`, `dev-login`, `dev-profile` |
| **Profile** | `profile-update`, `avatar-upload`, `backfill-avatars`, `account-delete` |
| **Email** | `email-verify-send`, `email-verify-confirm` |
| **Events** | `events-create`, `events-update` |
| **RSVP** | `rsvp` (join/leave via action param) |
| **Organiser** | `organiser-profile-create`, `organiser-profile-update` |
| **Ticketing** | `orders-reserve`, `orders-list`, `validate-discount`, `ticket-transfer`, `checkin-toggle` |
| **Payments** | `payments-intent`, `stripe-connect-onboard`, `stripe-connect-status`, `stripe-connect-dashboard`, `stripe-webhook` |
| **Social** | `attendee-broadcast`, `referrals-track`, `report-create`, `gif-search` |
| **Loyalty** | `loyalty-award-points` |
| **Notifications** | `notifications-send`, `notifications-process` |
| **Settings** | `settings-upsert` |
| **Support** | `support-request-create` |
| **Analytics** | `dashboard-analytics` |
| **Infra** | `health` |

### Postgres Functions / RPCs

| Function | Type | Purpose |
|----------|------|---------|
| `rsvp_join(event_id, status, guest_count)` | SECURITY DEFINER | Atomic RSVP with capacity locking, FOR UPDATE, conflict upsert |
| `rsvp_leave(event_id)` | SECURITY DEFINER | RSVP deletion |
| `award_points(action_type, description)` | SECURITY DEFINER | Points + rank calc + voucher issuance with row lock |
| `has_role(user_id, role)` / `is_admin(user_id)` | SECURITY DEFINER | Role checks (used in RLS policies) |
| `is_organiser_owner(profile_id, user_id)` | SECURITY DEFINER | Organiser ownership check |
| `is_organiser_member(profile_id, user_id)` | SECURITY DEFINER | Accepted team member check |
| `is_group_chat_member(group_id, user_id)` | SECURITY DEFINER | Chat membership check |
| `is_profile_public(user_id)` | SECURITY DEFINER | **⚠️ Currently hardcoded to return `true` — does NOT check profile_tier** |
| `get_mutual_friends(user_a, user_b)` | SECURITY DEFINER | Mutual friend lookup |
| `get_friend_count(user_id)` | SECURITY DEFINER | Friend count |
| `get_friends_and_following_count(user_id)` | SECURITY DEFINER | **⚠️ Same as get_friend_count (doesn't count organiser follows)** |
| `get_organiser_follower_count(id)` | SECURITY DEFINER | Follower count |
| `get_organiser_attendee_count(id)` | SECURITY DEFINER | Unique attendee count |
| `get_organiser_past_event_count(id)` | SECURITY DEFINER | Past event count |
| `get_personal_combined_event_count(user_id)` | SECURITY DEFINER | Past attended count |
| `get_group_chat_member_profiles(group_id)` | SECURITY DEFINER | Chat member profiles |
| `check_rate_limit(endpoint, user_id, ip, max, window)` | SECURITY DEFINER | Sliding window rate limiter |
| `cleanup_old_rate_limits()` | SECURITY DEFINER | Rate limit cleanup |
| `purge_expired_notifications()` | SECURITY DEFINER | Notification cleanup |
| `purge_orphaned_notifications()` | SECURITY DEFINER | Orphaned notification cleanup (dead links) |
| `handle_new_user()` | Trigger on auth.users | Auto-creates profile row on signup |
| `validate_post_content()` | Trigger on posts | Ensures post has content/image/GIF |
| `update_updated_at_column()` | Trigger | Auto-updates `updated_at` timestamps |

**Missing RPC**: `get_user_group_chats` — referenced in `Dashboard.tsx` but does not exist in the database. This causes a build error (TS2345). Needs to be created or the query needs to be rewritten as a standard Supabase query.

### Write Path: Edge Functions vs Client-Side

| Operation | Path | Why |
|-----------|------|-----|
| Auth (login, register, OTP) | Edge Function | Service role needed for auth.users access |
| Profile update | Edge Function (`profile-update`) | Server-side validation |
| Avatar upload | Edge Function (`avatar-upload`) | File validation, storage access |
| Event create/update/delete | Edge Function (`events-create`, `events-update`) | Authorization, side effects |
| RSVP join/leave | Edge Function → RPC (`rsvp_join`, `rsvp_leave`) | Atomic capacity enforcement |
| Order reserve | Edge Function (`orders-reserve`) | Inventory check, expiry management |
| Payment intent | Edge Function (`payments-intent`) | Stripe secret key required |
| Ticket issuance | Edge Function (`stripe-webhook`) | Webhook-driven, service role |
| Points award | Edge Function → RPC (`award_points`) | Race condition prevention |
| Post creation | **Client-side direct insert** | RLS: `auth.uid() = author_id` |
| Post like/unlike | **Client-side direct insert/delete** | RLS: `auth.uid() = user_id` |
| Post repost | **Client-side direct insert/delete** | RLS: `auth.uid() = user_id` |
| Connection request/accept | **Client-side direct** | RLS: `auth.uid() = requester_id/addressee_id` |
| Saved events | **Client-side direct** | RLS: `auth.uid() = user_id` |
| Group chat messages | **Client-side direct insert** | RLS: permissive authenticated |
| Event board messages | **Client-side direct insert** | RLS: attendee/host check |
| Notification mark read | **Client-side direct update** | RLS: `auth.uid() = user_id` |
| Settings (privacy, notifications) | Edge Function (`settings-upsert`) | Upsert logic |
| Report creation | Edge Function (`report-create`) | Validation |
| Organiser profile create/update | Edge Function | Avatar generation, validation |

### Queue Abstraction

**Edge Functions** (`supabase/functions/_shared/queue.ts`):
- In-process execution with 3-attempt retry.
- `enqueue(type, payload, options)` — fire-and-forget by default.
- `enqueueBatch(type, payloads[])` — parallel dispatch.
- Creates service role client per job execution.
- Handler registry via `registerHandler()`.

**Frontend** (`src/infrastructure/queue.ts`):
- Mirror types but in-memory, no retry.
- `QueueAdapter` interface ready for Cloud Tasks swap.
- **Currently unused** — no frontend code calls `queue.enqueue()`.

**Where queue is used**: `stripe-webhook` dispatches ticket issuance, RSVP auto-join, and loyalty points via queue. `notifications-process` batches notification sends. Other edge functions dispatch notifications via queue.

---

## 3. Modular Monolith Structure

### Feature Modules

| Module | Path | Status | Owns |
|--------|------|--------|------|
| **identity** | `src/features/identity/` | ✅ Active | `identityService` (getProfile, updateProfile, uploadAvatar), `identityRepository` (getProfile with dev-login fallback), `authorization.ts` (requireAuth, requireEventOwner — designed for edge functions but lives in frontend src) |
| **events** | `src/features/events/` | ✅ Active | `eventsService` (list, search, getEvent, getHostEvents, getRsvps, getUserRsvp), `eventsRepository` (direct Supabase queries with date/category/city/free filters), domain types |
| **loyalty** | `src/features/loyalty/` | ✅ Active | `loyaltyService` (getUserPoints, getVouchers, getTransactions, subscribeToPoints), `loyaltyRepository` (reads + realtime subscription), domain types (ranks, thresholds, action labels) |
| **social** | `src/features/social/` | ✅ Active | `feedService` (buildFeedContext, fetchFeedPage, fetchPublicFeedPage, fetchNearbyEvents), `recommendationService` (getSuggestedFriends) — no repository layer |
| **orders** | `src/features/orders/` | 🔲 **Empty scaffold** | `export {}` — order logic lives in `useOrderFlow` hook + edge functions |
| **notifications** | `src/features/notifications/` | ⚠️ **Re-export only** | Re-exports hooks from `src/hooks/useNotificationsQuery.ts` — no service or repository |

### Repository/Service Boundary Compliance

| Module | Repository | Service | Boundary Followed? |
|--------|-----------|---------|---------------------|
| identity | ✅ | ✅ | ⚠️ Mostly — service has fallback direct supabase write for mock login |
| events | ✅ | ✅ | ✅ Yes — reads through repo, writes through API |
| loyalty | ✅ | ✅ | ✅ Yes |
| social | ❌ No repo | ❌ feedService imports supabase directly | ❌ **Violates architecture** — feedService directly uses `@/integrations/supabase/client` instead of `@/infrastructure/supabase` |
| orders | ❌ | ❌ | N/A — not implemented |
| notifications | ❌ | ❌ | ❌ All logic in hooks |

**Key violations**:
- `src/features/social/services/feedService.ts` imports from `@/integrations/supabase/client` directly, bypassing `@/infrastructure/supabase`.
- `src/features/identity/services/authorization.ts` is designed for edge function use but lives in frontend `src/` — dead code on the client side.
- Many hooks (`useUserEventsQuery`, `useForYouEvents`, `useFriendsGoing`, `usePostsQuery`) query Supabase directly, bypassing the repository layer entirely.
- The `social` module has no repository at all — service does direct DB access.

---

## 4. Auth and Identity Model

### Personal Auth Model
- Phone-primary using Supabase Auth `signInWithPassword`.
- Phone → internal `@phone.local` email identifier in auth.users.
- OTP via Twilio Verify for phone ownership verification.
- Password stored in Supabase Auth (with lazy PBKDF2 migration from legacy hashing).
- Registration: `register` edge function creates auth user → `handle_new_user` trigger creates profile → edge function generates initials avatar.
- Login: `login` edge function does `signInWithPassword`, returns tokens → client calls `supabase.auth.setSession()`.

### Organiser Profile Model
- Separate `organiser_profiles` table, owned via `owner_id`.
- Created via `organiser-profile-create` edge function (with auto initials avatar).
- Team members via `organiser_members` table (roles: editor; status: pending/accepted).
- One user can own multiple organiser profiles.
- Each organiser profile can have its own Stripe Connect account (`organiser_stripe_accounts`).

### Active Profile Switching
- `ActiveProfileContext` in `src/contexts/ActiveProfileContext.tsx`.
- Stores selection in `localStorage` under `active_profile`.
- On init: parallel fetch of owned + accepted-member organiser profiles.
- Validates stored organiser profile still exists; falls back to personal if not.
- Long-press gesture on profile tab triggers `switchProfile()`.
- Active profile determines: post attribution, event ownership context, dashboard access, notification filtering.

### Ownership / Actor Context Semantics
- **Personal events**: `events.host_id = user_id` AND `organiser_profile_id IS NULL`.
- **Organiser events**: `events.organiser_profile_id = org_id` (host_id is still the creating user).
- **Post attribution**: When `organiser_profile_id` is set, feed shows organiser name/avatar instead of personal.
- **Dashboard access**: Gated by `activeProfile.type === 'organiser'` — simply owning an organiser profile doesn't grant dashboard access if in personal mode.

### Risks / Inconsistencies
1. **`is_profile_public()` is hardcoded to `return true`** — the privacy tier system (personal=private, professional=public) is NOT enforced at the DB level despite being implemented in the UI.
2. **`get_friends_and_following_count()` doesn't count organiser follows** — it's identical to `get_friend_count()`, which is misleading.
3. **`authorization.ts` lives in frontend but is designed for edge functions** — it's importable by frontend code but useless there (uses server patterns). Not actually shared with edge functions which have their own inline auth checks.
4. **Dev-login fallback in `identityRepository`** calls `dev-profile` edge function when RLS blocks profile reads — this masks real auth issues in development.

---

## 5. Feed Architecture

### Current Feed Algorithm (`src/features/social/services/feedService.ts`)
Deterministic weighted scoring, no ML.

### Source Buckets / Weights

| Priority | Source | Weight |
|----------|--------|--------|
| 1 | Friends / followed users posts | 100 |
| 2 | Followed organiser profile posts | 80 |
| 3 | Reposts by friends | 60 |
| 4 | Organisers that friends follow | 40 |
| 5 | Public content fallback | 10 |

Within each bucket: newest-first. Final sort: weight DESC → recency DESC.

### Feed Context
`buildFeedContext(userId)` — called once per session, cached 5 minutes by React Query.
- Fetches connections (accepted friends) and organiser follows in parallel.
- Then fetches organisers that friends follow (capped at 50 friends).
- Returns `FeedContext { userId, friendIds, followedOrgIds, friendFollowedOrgIds }`.

### Authenticated vs Unauthenticated
- **Authenticated**: `fetchFeedPage(ctx, cursor)` — weighted scoring with all 5 buckets.
- **Unauthenticated**: `fetchPublicFeedPage(cursor)` — everything gets weight 10 (public fallback), sorted by recency.
- Both use cursor-based pagination (20 posts per page).

### Pagination Strategy
- Cursor = ISO timestamp of last post's `created_at`.
- Over-fetches by 10 posts to account for repost merging.
- `useInfiniteQuery` with `getNextPageParam` from `hasMore` flag.
- Sentinel div with `IntersectionObserver` (200px rootMargin) triggers `fetchNextPage()`.

### Nearby Events
`fetchNearbyEvents(city, limit)` in `feedService.ts`:
- Queries upcoming public events matching user's city via `ilike`.
- If city returns < 2 results, backfills with any upcoming events.
- Hook: `useNearbyEvents()` in `useFeedQuery.ts`, stale time 2 minutes.

### Known Gaps / Bugs
1. **Duplicate feed systems**: `useFeedPosts()` in `usePostsQuery.ts` (legacy, non-paginated, limit 50) coexists with `usePaginatedFeed()` in `useFeedQuery.ts`. The Index page uses the new one; profile pages use the old one. Both subscribe to the same realtime channel, causing double invalidations.
2. **Repost deduplication is imperfect**: Same post can appear as both original and repost if the repost timestamp falls in a different cursor window than the original.
3. **No blocked user filtering in feed**: `blocked_users` table exists but feed queries don't filter out posts from blocked users.
4. **No muted connection filtering**: `connections.muted` column exists but isn't used in feed scoring.
5. **Friend-followed-org lookup is capped at 50 friends** — silently drops data for users with large friend networks.

---

## 6. Events Architecture

### Free Personal Events
- Created by personal profiles: `host_id = user_id`, `organiser_profile_id = NULL`.
- `ticket_price_cents = 0` by default, no ticket tiers required.
- RSVP-based attendance (join/leave via RPC).

### Organiser Events
- Created by organiser profiles: `organiser_profile_id = org_id`, `host_id = creating_user_id`.
- Can have ticket tiers with pricing.
- Paid events gated by Stripe Connect onboarding completion.
- Co-hosts via `event_cohosts` table.

### Event Board (Attendee Chat)
- `event_messages` table with realtime enabled (`supabase_realtime` publication).
- RLS restricts access to users with an RSVP or the event host.
- `EventBoard` component (`src/components/EventBoard.tsx`) renders a scrollable message feed with composer.
- Access check on EventDetail page: `userRsvp || isHost || hasTicket`.

### My Plans vs My Events (Tickets page — `src/pages/Tickets.tsx` / `src/hooks/useUserEventsQuery.ts`)

**My Plans** (`useUserPlannedEvents`):
- Aggregates from 3 sources in parallel: RSVPs (going/interested/pending), confirmed orders, saved events.
- Deduplicates by event_id.
- Each event tagged with `ticketStatus`: going | pending | interested | purchased | saved.
- Sorted chronologically with "Today" divider, past events above, upcoming below.
- Scroll anchoring to "Today" divider via `useLayoutEffect`.

**My Events** (`useUserCreatedEvents`):
- Personal profile: `host_id = userId AND organiser_profile_id IS NULL`.
- Organiser profile: `organiser_profile_id = activeProfileId`.
- Only shown when active profile type is personal; organiser profiles see `OrganiserDashboard` instead.

### RSVP / Ticket / Reservation Relationships
```
Event
├── rsvps (free attendance — via rsvp_join/rsvp_leave RPCs)
├── ticket_tiers (pricing structure)
│   └── orders (reservation → payment → confirmation)
│       └── tickets (issued post-payment via webhook)
├── saved_events (bookmarks)
├── waitlist (capacity overflow)
└── event_messages (attendee chat — realtime)
```

- Free events: RSVP directly, no order/ticket.
- Paid events: Order → Payment → Ticket + auto-RSVP (going).
- Guest counts: RSVP supports +1 to +5, clamped server-side.

### Remaining Logic Problems
1. **Waitlist is schema-only**: Table exists, but no code actually enqueues users to waitlist when events reach capacity. `rsvp_join` raises an exception at capacity — it doesn't redirect to waitlist.
2. **`event_reminders` has no processing logic**: Reminders can be created/managed by hosts, but there's no scheduled job that actually sends them.
3. **Guestlist approval workflow incomplete**: `guestlist_require_approval` and `guestlist_deadline` columns exist, but the approval UI and enforcement logic aren't fully wired.
4. **`publish_at` scheduling is not enforced**: Events with future `publish_at` are still queryable — no filter excludes unpublished events from public listings.
5. **Event `status` field** defaults to `'published'` but draft/cancelled statuses aren't consistently filtered in queries.

---

## 7. Payments Architecture

### Current Order Flow (`src/hooks/useOrderFlow.ts`)
1. **Reserve**: `useOrderFlow().reserve()` → `orders-reserve` edge function → creates order with 15-min expiry, `status = 'reserved'`.
2. **Payment Intent**: `useOrderFlow().createPaymentIntent()` → `payments-intent` edge function → creates Stripe PaymentIntent with destination charge (organiser's connected account).
3. **Checkout UI**: `src/pages/Checkout.tsx` — Stripe Elements `<PaymentElement>` → `stripe.confirmPayment()` → redirect to `/checkout/success`.
4. **Webhook Processing**: `stripe-webhook` edge function handles:
   - `payment_intent.succeeded` → confirms order, issues tickets, auto-RSVPs going, awards loyalty points.
   - `payment_intent.payment_failed` → marks order failed.
   - `charge.refunded` → processes refund.

### Stripe Connect Model
- Express accounts with destination charges.
- `ticket_price + 7% service_fee` charged to customer.
- `application_fee_amount` = service fee retained by platform.
- Organiser receives full ticket price.
- Onboarding: `stripe-connect-onboard` → generates account link. `stripe-connect-status` → checks `charges_enabled` / `payouts_enabled`.
- Hard block: Paid ticket tiers can't be created until organiser completes onboarding.

### Inventory Control
- Server-side `SUM(quantity)` in `orders-reserve` checks available inventory against `ticket_tiers.available_quantity`.
- 15-minute reservation expiry prevents inventory lockup.

### Discount Codes
- `validate-discount` edge function: checks code validity, event match, usage limits.
- Types: percentage or fixed amount.
- Can reveal hidden ticket tiers.

### What's Implemented vs Missing

| Feature | Status |
|---------|--------|
| Order reservation with expiry | ✅ Implemented |
| Stripe PaymentIntent creation | ✅ Implemented |
| Webhook order confirmation | ✅ Implemented |
| Ticket issuance (QR) | ✅ Implemented (via webhook queue) |
| Auto-RSVP on purchase | ✅ Implemented (via webhook queue) |
| Loyalty points on purchase | ✅ Implemented (via webhook queue) |
| Refund processing | ✅ Schema + webhook handler |
| Discount code validation | ✅ Implemented |
| Ticket transfer | ✅ Edge function exists |
| Expired order cleanup | ⚠️ Job type defined but **no scheduled trigger** |
| Multi-currency | ⚠️ `currency` column exists (default 'zar') but no UI for selection |
| Stripe publishable key | ⚠️ **Hardcoded in `src/lib/stripe.ts`** — should be env var |
| Order listing for hosts | ✅ `orders-list` edge function with host authorization |

---

## 8. Admin / Moderation Architecture

### Schema

| Table | RLS | Client Access |
|-------|-----|---------------|
| `user_roles` | Admin read only, no client writes (`false` policy) | Read via `is_admin()` |
| `reports` | Users insert own + view own; admins manage all | Insert + select |
| `moderation_actions` | Admin select only, no client writes | Read only |
| `support_requests` | No RLS policies visible for user access | Insert via edge function |

### What's Wired vs Schema-Only

| Feature | Status |
|---------|--------|
| Role-based access (super_admin, moderator, support) | ✅ Schema + DB functions (`has_role`, `is_admin`) |
| RLS policies using roles | ✅ Reports, moderation_actions use `is_admin()` |
| User report submission | ✅ `report-create` edge function |
| Support request submission | ✅ `support-request-create` edge function |
| Admin dashboard UI | ❌ **Not implemented** — no admin pages exist |
| Report review/resolution | ❌ **Schema only** — `assigned_admin_id`, `resolution_notes`, `status` columns exist but no UI |
| Moderation action recording | ❌ **Schema only** — table has no-write policy, nothing writes to it |
| User suspension/ban | ❌ **Not implemented** |
| Content takedown | ❌ **Not implemented** |
| Admin role assignment | ❌ **Manual DB only** — no UI or edge function |

---

## 9. Async / Queue Architecture

### Queue Abstraction

**Edge Functions** (`supabase/functions/_shared/queue.ts`):

```typescript
type JobType =
  | 'notification.send'
  | 'notification.process_batch'
  | 'loyalty.award_points'
  | 'loyalty.rank_up_voucher'
  | 'rsvp.auto_mark_going'
  | 'tickets.issue'
  | 'referral.track'
  | 'cleanup.expired_orders'
  | 'cleanup.expired_notifications';
```

- In-process execution: handler runs immediately in same invocation.
- 3-attempt retry with error logging.
- `fireAndForget = true` by default (errors logged, not propagated).
- Service role client created per job.
- Handler registry via `registerHandler()` + `_shared/job-handlers.ts`.

### What Currently Dispatches Through Queue
- `stripe-webhook`: dispatches `tickets.issue`, `rsvp.auto_mark_going`, `loyalty.award_points` after successful payment.
- `notifications-process`: dispatches `notification.send` for batch processing.
- Various edge functions dispatch `notification.send` for user alerts.

### What Runs Inline (Not Queued)
- `loyalty-award-points`: directly calls `award_points` RPC, no queue.
- `events-create` / `events-update`: direct DB writes, no queue.
- `rsvp`: direct RPC call, no queue.
- All client-side writes (posts, likes, connections): inline Supabase client calls.

### Cloud Tasks Readiness
- Both frontend and edge function queue modules document the swap path.
- `QueueAdapter` interface exists for frontend.
- Edge function queue has clear `dispatch()` seam.
- **Gap**: No DLQ (dead letter queue), no job persistence, no visibility into failed jobs beyond console.error.
- **Gap**: Frontend `queue.ts` is completely unused — no code imports or calls it.

---

## 10. Environment / Deployment State

### Lovable Platform
- Source of truth for Supabase project (Lovable Cloud).
- Auto-manages: `supabase/config.toml`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`.
- Edge functions auto-deployed on push.
- Preview URL: `https://id-preview--{id}.lovable.app`.
- Published URL: `https://social-soiree-site.lovable.app`.

### GitHub
- CI workflow in `.github/workflows/ci.yml`.
- Git-based version control.

### Environment Config (`src/infrastructure/config.ts`)
```typescript
config.env       // 'development' | 'staging' | 'production' (from import.meta.env.MODE)
config.isDev     // boolean
config.isProd    // boolean
config.functionsUrl  // ${VITE_SUPABASE_URL}/functions/v1
```

### Secrets (Edge Functions)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `LOVABLE_API_KEY`.

### Missing for Staging/Prod Readiness
1. **No staging environment** — single Supabase project for all environments.
2. **No database migrations CI** — migrations managed via Lovable UI, not reviewable in PRs.
3. **Stripe publishable key hardcoded** in `src/lib/stripe.ts` — should be `VITE_STRIPE_PUBLISHABLE_KEY`.
4. **No CORS configuration** for production domain in edge functions (using `*` wildcard).
5. **No error monitoring** (Sentry, LogRocket, etc.).
6. **No performance monitoring** (no Web Vitals tracking).
7. **No E2E tests** — only CI lint/typecheck.
8. **Logger uses `import.meta.env.PROD`** for JSON toggle — works but no structured log aggregation service.

---

## 11. Architecture Risks and Inconsistencies

### Critical

1. **`is_profile_public()` returns `true` unconditionally** (`SELECT true`)
   - File: DB function `is_profile_public`
   - Impact: The entire privacy tier system (personal=private, professional=public) is unenforced at the database level. Any authenticated user can view any profile regardless of `profile_tier` or `privacy_settings.go_public`.

2. **Stripe publishable key hardcoded**
   - File: `src/lib/stripe.ts` (line 3)
   - Impact: Can't switch between test/live keys without code change. Risk of accidentally shipping test key to production or vice versa.

3. **No expired order cleanup**
   - Job type `cleanup.expired_orders` is defined but no cron or trigger invokes it. Reserved orders that expire after 15 minutes remain in `status = 'reserved'` indefinitely, potentially blocking inventory.

4. **`publish_at` scheduling not enforced**
   - Events with future `publish_at` timestamps appear in all public queries. No filter in `eventsRepository.list()` or `eventsRepository.search()` excludes them.

5. **Missing `get_user_group_chats` RPC**
   - `Dashboard.tsx` calls `supabase.rpc("get_user_group_chats")` but this function does not exist in the database. Causes a TypeScript build error and runtime failure on the messages page.

### Architectural Mismatches

6. **Dual feed systems**
   - `usePostsQuery.ts` → `useFeedPosts()` (legacy, limit 50, no pagination, no scoring)
   - `useFeedQuery.ts` → `usePaginatedFeed()` (v1 personalized, paginated, scored)
   - Both subscribe to same realtime channel. Index page uses new system; profile pages use old system. Should consolidate.

7. **Social module bypasses infrastructure layer**
   - `src/features/social/services/feedService.ts` imports `@/integrations/supabase/client` directly (should use `@/infrastructure/supabase`).
   - No repository layer — service does direct DB queries, violating the architecture's read path.

8. **`authorization.ts` is dead frontend code**
   - `src/features/identity/services/authorization.ts` contains server-side authorization patterns (`requireAuth`, `requireEventOwner`) but lives in the frontend bundle. Edge functions have their own inline auth checks. This file is never imported by any frontend code.

9. **Frontend queue abstraction is unused**
   - `src/infrastructure/queue.ts` defines `QueueAdapter` and `InMemoryQueue` but nothing imports or uses it.

10. **Orders module is empty**
    - `src/features/orders/index.ts` exports nothing. Order logic is split across `useOrderFlow` hook, `orders-reserve` edge function, `payments-intent` edge function, and `stripe-webhook`. No domain types, service, or repository.

11. **Notifications module is just re-exports**
    - `src/features/notifications/index.ts` re-exports hooks from `src/hooks/`. No service, repository, or domain types.

### Incomplete Flows

12. **Waitlist is schema-only**
    - `waitlist` table exists with `position` and `notified_at` columns, but `rsvp_join` raises an exception at capacity instead of enqueuing to waitlist. No notification flow when spots open.

13. **Event reminders have no processing**
    - `event_reminders` table allows hosts to configure reminders, but no scheduled job actually sends them.

14. **Guestlist approval is partial**
    - `guestlist_require_approval` and `guestlist_deadline` exist on events, but no approval/rejection UI or enforcement logic.

15. **Admin UI doesn't exist**
    - Reports, moderation actions, support requests have full schema but no admin pages, no admin routes, no admin dashboard.

16. **`get_friends_and_following_count` is misleading**
    - Function name implies it counts friends AND organiser follows, but implementation is identical to `get_friend_count` — only counts accepted connections.

### Frontend/Backend Inconsistencies

17. **Profile update dual path**
    - `identityService.updateProfile()` checks for session: if present, calls `profile-update` edge function; if not, writes directly via Supabase client (for mock/dev login). This means dev path bypasses all server-side validation.

18. **Blocked users not filtered in feed**
    - `blocked_users` table has proper RLS, but `feedService.ts` and `usePostsQuery.ts` don't filter posts from blocked users.

19. **Muted connections not used**
    - `connections.muted` column exists but feed scoring ignores it entirely.

20. **Event status not filtered**
    - Events have a `status` column (default 'published') but queries don't filter by status — draft or cancelled events could appear in listings.

21. **Organiser verification is implicit vs explicit**
    - Feed enrichment hardcodes `author_is_verified = true` for all organiser profile posts, but personal profile verification is DB-driven (`is_verified` column). These are semantically different verification concepts treated identically in the UI.

---

*Last updated: 13 March 2026*
