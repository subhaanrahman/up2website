# Dylan — Handover Notes

## 9 March 2026

- **Multi-reaction system**: Added `reaction_type` column to `post_likes` with 5 emoji options (❤️ 🔥 👀 🙏 🩷); long-press picker UI with stacked emoji breakdown on feed
- **Reaction picker component**: Built `ReactionPicker.tsx` with 500ms long-press trigger, optimistic UI updates, and per-post breakdown display
- **Post interactions hook refactor**: Rewrote `usePostInteractions.ts` to support react/unreact/change-reaction with deduplication via unique constraint
- **Notifications service backend**: Created `notifications-process` edge function (hourly cron) handling event reminders, saved-event nudges, friend activity, and suggested accounts
- **Notifications send endpoint**: Created `notifications-send` edge function for real-time triggers (shares, friend requests, new organiser posts)
- **Notification deduplication**: 24-hour window for cron notifications, 1-hour for send — prevents duplicate alerts
- **Notification settings respect**: All notification generation checks user `notification_settings` preferences before inserting
- **NotificationItem UI update**: Added icon/color mapping for all new notification types (friend_request, event_reminder, saved_event_nudge, etc.)
- **Cron scheduling**: Configured `pg_cron` + `pg_net` to trigger `notifications-process` hourly via HTTP POST
- **Gamification options doc**: Created `docs/GAMIFICATION_OPTIONS.md` with full roadmap — streaks, badges, leaderboards, referrals, nightlife-specific mechanics, and organiser tiers

---

## 8 March 2026 (Session 3 — for Haan's review)

- **Opening hours field**: Added `opening_hours` JSONB column to `organiser_profiles`; editing UI shown only for Venue category profiles
- **Tags (genre/crowd/features)**: Added `tags` JSONB array to `organiser_profiles` with tag picker UI featuring suggestions and custom input
- **Terms of Service page**: Created `/terms` with sample ToS content
- **Privacy Policy page**: Created `/privacy` with sample privacy policy content; both linked from auth page and About page
- **Email verification (optional MFA)**: Built OTP-based email verification at `/settings/email-verification` with send → verify → verified states; added `email_verified` column to profiles; edge functions `email-verify-send` and `email-verify-confirm` deployed
- **DM system deferred**: Organiser DM/contact feature skipped for now — added to `docs/BACKEND_TODO.md` for future implementation

---

## 8 March 2026 (Session 2)

### Summary of Changes

- **Event-linked posts**: Added `event_id` column to `posts` table; events-create edge function now auto-creates a feed post when an event is created
- **Post collaborators**: Created `post_collaborators` table with RLS policies (author can add, author/self can remove); posts in the feed now display collaborator avatars and names ("with Dylan, Kai")
- **Collaborator picker UI**: New `CollaboratorPicker` component in PostComposer — search friends and add them as collaborators to any post (auto-accept for now)
- **Event card in feed**: `FeedPost` now renders event-linked posts as rich cards with event title, date, location, and cover image — clicking navigates to event detail
- **Existing events backfill**: Created posts for all 7 existing events in the database, linked to the organiser profile

---

##

### Summary of Changes

- **Notifications backend system**: Created `notifications` table with RLS policies, realtime, 10-day auto-expiry, and `purge_expired_notifications` DB function with daily cron job
- **Notifications UI rewrite**: Replaced mock data with real DB queries; extracted `NotificationItem` component; added "Mark all read" button
- **Unread notification badge**: Home page bell icon now shows live unread count badge from DB with realtime updates
- **Notifications hooks**: New `useNotificationsQuery.ts` with `useNotifications`, `useUnreadCount`, `useMarkNotificationRead`, `useMarkAllRead` hooks
- **Organiser Dashboard tabs**: Added Upcoming/Past tabs to event list in organiser dashboard with correct chronological sorting
- **Tickets page scroll-to-today**: Tickets page now anchors at "Today" divider on load — upcoming events below, past events above (scrollable)
- **RSVP population**: Assigned Dylan's account as "going" to all 7 existing events to populate tickets list
- **RSVP-aware event detail**: Event detail page now checks user's existing RSVP — shows "You're Going!" with cancel option instead of duplicate RSVP button; added loading state for RSVP actions
- **Suggested friends fix**: Friends recommendation now excludes users with existing connections (pending or accepted) so existing friends no longer appear in suggestions
- **Recommendation service**: Created `src/features/social/services/recommendationService.ts` — centralised module for friend suggestions and feed ranking; currently rule-based, designed for future ML scoring
- **Social module export**: Updated `src/features/social/index.ts` to export recommendation service
- **Multi-day event date display**: Fixed timezone-shift bug causing Dec 31 events to render as Jan 1; event detail now shows date ranges (e.g. "Wednesday, Dec 31 – Thursday, Jan 1") and time ranges for multi-day events
- **NYE 2026 DB fix**: Updated NYE event to span Dec 31 2026 → Jan 1 2027 as a multi-day event test case

## 7 March 2026

### Summary of Changes

- **Auto-generated initials avatars**: On registration and organiser profile creation, an SVG initials avatar is now generated and uploaded to storage so `avatar_url` is never null — eliminates UI fallback logic
- **Backfill edge function**: Created `backfill-avatars` to retroactively generate initials avatars for all existing profiles (personal + organiser) with null `avatar_url`
- **Shared avatar utility**: New `_shared/avatar.ts` with deterministic hue from user ID, SVG generation, and storage upload
- **Post attribution fix**: Posts made from an organiser profile now display the organiser's name and avatar in the feed instead of the personal profile
- **Event ordering fix**: Upcoming events sort ascending (soonest first), past events sort descending (most recent first) across Profile and Dashboard
- **Profile event filtering for organisers**: When viewing as an organiser, Profile page now queries events by `organiser_profile_id` instead of `host_id`
- **Login speed fix**: Dropped 6 duplicate unique indexes on `rate_limits` table that caused `ON CONFLICT` errors and ~5s latency on phone check
- **Co-host search**: Replaced plain text input in event creation with debounced autocomplete that queries `profiles` and prioritises accepted connections

## 5 March 2026

### Summary of Changes

- **Rich post composer**: Dynamic textarea (starts single-line, expands as you type), image upload to storage bucket with preview, GIF button placeholder (API TBD)
- **Post media schema**: Added `image_url` and `gif_url` columns to `posts`, made `content` nullable, added `validate_post_content` trigger
- **Post images storage**: Created `post-images` public bucket with authenticated upload and public read RLS policies
- **FeedPost media rendering**: Updated `FeedPost.tsx` to display images and GIFs inline below text content
- **Post queries updated**: `usePostsQuery` now selects `image_url` and `gif_url`; feed pages pass media props through

### Summary of Changes (cont.)

- **Auth flow UX**: Refactored `PhoneStep` to navigate instantly to OTP/password step; OTP send fires in background (fire-and-forget)
- **Phone column on profiles**: Added unique indexed `phone` column to `profiles` table for fast phone lookups
- **check-phone rewrite**: Replaced `admin.listUsers()` scan with direct `profiles.phone` query (indexed)
- **login rewrite**: Replaced `admin.listUsers()` with `profiles.phone` lookup → `getUserById()` for password verification
- **register update**: Replaced `admin.listUsers()` duplicate check with `profiles.phone` lookup; stores phone on profile row after creation
- **Backfill**: Updated existing profile rows with phone numbers from `auth.users`

### Summary of Changes (cont.)

- **Posts system**: Created `posts` table with `author_id`, `organiser_profile_id`, `content`, realtime enabled, RLS policies (authenticated read, author insert/delete)
- **PostComposer wired**: Post button now inserts into `posts` table; clears on success; supports posting as organiser
- **FeedPost component**: New reusable component for rendering feed posts with author info and relative timestamps
- **Home feed**: `Index.tsx` now queries real posts from DB with realtime subscription for instant updates
- **Profile feed tab**: `Profile.tsx` feed tab now shows user's own posts (or organiser posts when in org mode)
- **Organiser follow model**: `UserProfile.tsx` shows FOLLOW/FOLLOWING for organiser profiles using `organiser_followers` table (no request/accept)
- **Public/private profiles**: Personal profiles can toggle public/private via `EditProfile.tsx` switch; public profiles get FOLLOW button (auto-accepted connection), private profiles keep friend request flow
- **usePostsQuery hook**: New hook with `useFeedPosts`, `useUserPosts`, `useOrganiserPosts` queries

## 3 March 2026

### Summary of Changes

- **Organiser Team / Invite System**: Created `organiser_members` table with roles (`admin`, `editor`), statuses (`pending`, `accepted`, `declined`), and full RLS policies
- **Team Management page** (`/profile/organiser-team`): Search users by username, invite, remove, change roles
- **Pending Invites component**: Shown on Settings page for accepting/declining invitations
- **ActiveProfileContext update**: Merged accepted memberships into profile switcher
- **DB helper functions**: `is_organiser_owner`, `is_organiser_member`
- **Profile Metrics Rework**: New `organiser_followers` table; new DB functions for follower count, past event count, combined event count, friends+following count
- **UI metrics update**: Organiser profiles show "Followers" + past events; personal profiles show "Friends / Following" + combined event count
