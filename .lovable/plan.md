

## Organiser Account Team Members / Invite Flow

### Problem
Currently, only the owner of an organiser profile can control it. There's no way to invite other users to help manage an organiser account.

### Solution
Create an invitation system where an organiser account owner can invite personal accounts (by username or search) to become team members with a defined role. Invited users can then switch to that organiser profile and perform actions on its behalf.

### Database Changes

**New table: `organiser_members`**
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| organiser_profile_id | uuid | FK to organiser_profiles |
| user_id | uuid | The invited user's auth ID |
| role | text | `admin` or `editor` (owner is implicit from organiser_profiles.owner_id) |
| status | text | `pending`, `accepted`, `declined` |
| invited_by | uuid | The user who sent the invite |
| created_at | timestamptz | |
| accepted_at | timestamptz | nullable |

Unique constraint on `(organiser_profile_id, user_id)`.

**RLS policies:**
- Owner of the organiser profile can SELECT, INSERT, UPDATE, DELETE
- The invited user (`user_id`) can SELECT and UPDATE (to accept/decline)
- Accepted members can SELECT all members of the same organiser profile

### UI Changes

1. **Team Management Page** (`/profile/organiser-team`)
   - Accessible from the organiser profile page (new "Manage Team" button visible only when the active profile is an organiser the user owns)
   - Lists current members with their role and status
   - Search bar to find users by username/display name (queries `profiles` table)
   - Invite button sends an invite (inserts into `organiser_members` with status `pending`)
   - Owner can remove members or change roles

2. **Invite Notifications / Pending Invites**
   - On the personal profile's Settings or Notifications page, show pending organiser invites
   - Accept/Decline buttons update the `organiser_members` row status

3. **ActiveProfileContext Update**
   - When fetching organiser profiles the user can switch to, also query `organiser_members` where `user_id = current_user` and `status = 'accepted'`
   - Join with `organiser_profiles` to get the profile details
   - Merge these "member" profiles into the profile switcher alongside owned profiles
   - Add a `membership` field to distinguish owned vs member profiles

### Edge Function (optional, for security)
An `organiser-invite` edge function could handle the invite to ensure proper authorization, but since the RLS policies gate access appropriately, direct client inserts with RLS should suffice for the initial implementation.

### Route Addition
- `/profile/organiser-team` — new protected route for the Team Management page

### File Changes Summary
| File | Change |
|---|---|
| Migration SQL | Create `organiser_members` table with RLS |
| `src/pages/OrganiserTeam.tsx` | New page: list members, search & invite users, remove members |
| `src/contexts/ActiveProfileContext.tsx` | Fetch accepted memberships and merge into switchable profiles |
| `src/pages/Profile.tsx` | Add "Manage Team" link when viewing owned organiser profile |
| `src/App.tsx` | Add route for `/profile/organiser-team` |
| `src/pages/Settings.tsx` or `src/pages/Notifications.tsx` | Show pending organiser invites for acceptance |

