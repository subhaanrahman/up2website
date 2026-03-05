# Dylan — Handover Notes

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
