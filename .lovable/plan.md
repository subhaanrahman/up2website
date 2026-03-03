

## Plan: Update Classification Options

### Changes

**1. `src/pages/EditProfile.tsx`** — Personal profile classifications
- Change `PAGE_CLASSIFICATIONS` to `["DJ", "Promoter", "Artist"]`
- Make the field optional (not pre-selected). Send `null` when nothing is chosen so the DB stores no classification by default
- Add a "None" / clear option so users can deselect if they previously chose one
- Update the label to something like "Classification (optional)"

**2. `src/pages/CreateOrganiserProfile.tsx`** — Organiser categories
- Change `CATEGORIES` from `["Promoter", "Artist", "DJ", "Brand", "Organization", "Venue"]` to `["Venue", "Event"]`
- Default to `"Venue"`

**3. `supabase/functions/profile-update/index.ts`** — Validation
- Update the `page_classification` enum to `z.enum(['DJ', 'Promoter', 'Artist']).optional().nullable()` — accepts these three or null

**4. `supabase/functions/organiser-profile-create/index.ts`** — Validation
- Update `CATEGORIES` to `['Venue', 'Event']`, default `'Venue'`

