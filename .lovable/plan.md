

## Analysis

The user wants a **multi-profile system** (not multi-auth-account). A single authenticated user can have:
1. **One personal profile** (mandatory, created at registration)
2. **One or more organiser profiles** (optional, created from within the app)

Switching between them uses the existing long-press account switcher on the profile tab. The active profile determines what the user sees (e.g., organisers can create events, add co-hosts).

This is a significant architectural change. Here is the plan:

---

## Plan

### 1. New `organiser_profiles` database table

Create a separate table for organiser accounts linked to the user's auth ID:

```sql
CREATE TABLE public.organiser_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  city text,
  instagram_handle text,
  category text NOT NULL DEFAULT 'Promoter', -- Promoter, Artist, DJ, Brand, Organization, Venue
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: owner can CRUD their own organiser profiles. Other authenticated users can SELECT (for public visibility).

### 2. Active profile context

Create an `ActiveProfileContext` that tracks which profile (personal or organiser) is currently selected. Store the active profile ID and type in React state (persisted to `localStorage` so it survives refreshes).

```text
ActiveProfileContext
├── activeProfile: { id, type: 'personal' | 'organiser', displayName, avatarUrl }
├── switchProfile(id, type)
├── organiserProfiles: OrganiserProfile[]
└── isOrganiser: boolean  (shortcut for activeProfile.type === 'organiser')
```

### 3. Update the account switcher sheet (BottomNav)

The existing long-press sheet currently shows "Add Account" and "Sign Out". Update it to:
- List the user's **personal profile** (always first, marked as default)
- List all **organiser profiles** owned by the user
- Highlight the currently active one
- "Create Organiser Page" button (instead of "Add Account" which implies a new auth account)
- "Sign Out" stays

Tapping a profile in the list calls `switchProfile()`.

### 4. "Create Organiser Page" flow

New page `/profile/create-organiser` with a form for:
- Display name, username, bio, city, Instagram handle
- Category (Promoter, Artist, DJ, Brand, Organization, Venue)

Submits to a new `organiser-profile-create` edge function that validates and inserts into `organiser_profiles`.

### 5. Gate organiser features behind active profile type

- **Create Event**: Only available when the active profile is an organiser. Show a prompt/redirect if a personal account tries to access `/create`.
- **Profile page**: Render data from `profiles` table when personal is active, from `organiser_profiles` when an organiser is active.
- **Edit Profile**: Route to the correct edit form based on active profile type.
- The `page_classification` on the personal profile becomes fixed to `Personal`. The organiser-specific classifications (Promoter, DJ, etc.) move to the `organiser_profiles.category` column.

### 6. Co-hosts (future-ready, not fully implemented now)

Add an `event_cohosts` table for linking organiser profiles to events. This sets up the data model but full co-host management UI can come later.

```sql
CREATE TABLE public.event_cohosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organiser_profile_id uuid NOT NULL REFERENCES organiser_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'cohost',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, organiser_profile_id)
);
```

### 7. Update events table

Events currently use `host_id` referencing `auth.users`. We should add an `organiser_profile_id` column so events are owned by an organiser profile rather than a raw user ID. The existing `host_id` stays for RLS compatibility, but the organiser profile link adds the association.

---

### Summary of files to create/modify

| Action | File |
|--------|------|
| Create | Migration: `organiser_profiles` + `event_cohosts` tables |
| Create | `src/contexts/ActiveProfileContext.tsx` |
| Create | `src/pages/CreateOrganiserProfile.tsx` |
| Create | `supabase/functions/organiser-profile-create/index.ts` |
| Modify | `src/components/BottomNav.tsx` — profile switcher UI |
| Modify | `src/pages/Profile.tsx` — render based on active profile |
| Modify | `src/pages/CreateEvent.tsx` — gate behind organiser check |
| Modify | `src/App.tsx` — wrap with ActiveProfileProvider, add route |
| Modify | `src/pages/EditProfile.tsx` — remove organiser classifications from personal profile |

### Technical detail: Page classification cleanup

Personal profiles will have `page_classification` fixed to `'Personal'`. The organiser-specific types (Promoter, Artist, DJ, Brand, Organization, Venue) move to `organiser_profiles.category`. The `profile-update` edge function validation will be simplified to only accept `'Personal'` for the personal profile.

