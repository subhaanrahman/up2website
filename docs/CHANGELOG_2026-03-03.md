# Changes — 3 March 2026 (User: dylangodwin)

## 1. Organiser Team / Invite System
- Created `organiser_members` table for inviting personal accounts to manage organiser profiles
- Roles: `admin`, `editor` (owner is implicit from `organiser_profiles.owner_id`)
- Statuses: `pending`, `accepted`, `declined`
- RLS policies: owner can CRUD, invited user can view/accept/decline, accepted members can view teammates
- Built **Team Management page** (`/profile/organiser-team`) — search users by username, invite, remove, change roles
- Built **Pending Invites component** shown on Settings page for accepting/declining invitations
- Updated `ActiveProfileContext` to merge accepted memberships into the profile switcher
- Added `is_organiser_owner` and `is_organiser_member` helper DB functions
- Added "Manage Team" button on Profile page (visible to organiser owners only)

## 2. Profile Metrics Rework
### Problem
- Event count was just `hostEvents.length` for all profiles
- Social count only showed accepted friend connections

### Solution
- **New table: `organiser_followers`** — tracks users following organiser/venue profiles
- **New DB functions:**
  - `get_organiser_follower_count` — follower count for an organiser
  - `get_organiser_past_event_count` — past events hosted by an organiser
  - `get_personal_combined_event_count` — personal past events + past events from all owned/member organiser accounts (deduplicated)
  - `get_friends_and_following_count` — accepted connections + followed organisers
- **UI updates** on `Profile.tsx` and `UserProfile.tsx`:
  - Organiser profiles show **"Followers"** and past event count
  - Personal profiles show **"Friends / Following"** (friends + followed organisers) and combined event count

## Summary of Files Changed
| File | Action |
|---|---|
| `supabase/migrations/…_organiser_members.sql` | Created `organiser_members` table, RLS, helper functions |
| `supabase/migrations/…_profile_metrics_rework.sql` | Created `organiser_followers` table, 4 new RPC functions |
| `src/pages/OrganiserTeam.tsx` | New page — team management UI |
| `src/components/PendingOrganiserInvites.tsx` | New component — accept/decline invites |
| `src/contexts/ActiveProfileContext.tsx` | Fetch accepted memberships into profile switcher |
| `src/pages/Profile.tsx` | Manage Team button, new metric queries & labels |
| `src/pages/UserProfile.tsx` | Updated metric queries & labels |
| `src/pages/Settings.tsx` | Added pending invites section |
| `src/App.tsx` | Added `/profile/organiser-team` route |
| `.lovable/plan.md` | Documented organiser team plan |
