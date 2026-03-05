# Dylan — Handover Notes

## 3 March 2026

### Summary of Changes

- **Organiser Team / Invite System**: Created `organiser_members` table with roles (`admin`, `editor`), statuses (`pending`, `accepted`, `declined`), and full RLS policies
- **Team Management page** (`/profile/organiser-team`): Search users by username, invite, remove, change roles
- **Pending Invites component**: Shown on Settings page for accepting/declining invitations
- **ActiveProfileContext update**: Merged accepted memberships into profile switcher
- **DB helper functions**: `is_organiser_owner`, `is_organiser_member`
- **Profile Metrics Rework**: New `organiser_followers` table; new DB functions for follower count, past event count, combined event count, friends+following count
- **UI metrics update**: Organiser profiles show "Followers" + past events; personal profiles show "Friends / Following" + combined event count
