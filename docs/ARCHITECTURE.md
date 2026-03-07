# Architecture Overview

## Modular Monolith

The codebase follows a **modular monolith** pattern with strict feature boundaries.

```
src/
├── features/           # Domain modules
│   ├── identity/       # Auth, session, profiles
│   ├── events/         # Events, RSVP
│   ├── loyalty/        # Points, tiers, vouchers
│   ├── social/         # Shares, referrals (scaffold)
│   ├── orders/         # Order/ticket states (scaffold)
│   └── notifications/  # Push/email abstraction (scaffold)
├── api/                # Client-side API wrappers (call Edge Functions)
├── infrastructure/     # Config, logging, errors, supabase client, queue
├── hooks/              # React Query hooks (server-state management)
├── components/         # Shared UI components
└── pages/              # Route-level page components

supabase/
└── functions/          # Edge Functions (server-side API layer)
    ├── _shared/        # Shared utilities (avatar generation, password, rate-limit)
    ├── rsvp/           # Atomic RSVP join/leave via DB functions
    ├── events-create/  # Event creation
    ├── events-update/  # Event updates
    ├── avatar-upload/  # Avatar file upload with validation
    ├── backfill-avatars/ # One-time initials avatar backfill
    ├── organiser-profile-create/ # Organiser profile + auto initials avatar
    ├── organiser-profile-update/
    ├── loyalty-award-points/
    ├── settings-upsert/
    ├── profile-update/
    ├── referrals-track/
    ├── orders-reserve/ # Stub
    ├── payments-intent/# Stripe integration
    └── health/         # Healthcheck
```

## Import Rules

| Layer | May Import | Must NOT Import |
|-------|-----------|-----------------|
| Pages / Components | Services, `src/api`, hooks | Repositories, Supabase client |
| Services | Repositories | Supabase client directly |
| Repositories | `infrastructure/supabase` | Services, API wrappers |
| `src/api` wrappers | `infrastructure/api-client` | Repositories, Services |

## Data Flow

1. **Reads**: UI → React Query hook → Service → Repository → Supabase (direct read)
2. **Writes**: UI → React Query mutation → `src/api` wrapper → Edge Function → DB (via RPC or direct)

## Profile Identity Model

- **Personal profiles** (`profiles` table): Linked to `auth.users` via `user_id`. Always have an `avatar_url` (initials SVG generated on registration).
- **Organiser profiles** (`organiser_profiles` table): Owned by a user (`owner_id`). Also get an auto-generated initials avatar on creation.
- **Active profile switching**: `ActiveProfileContext` allows toggling between personal and organiser identities. Posts, events, and feed attribution respect the active profile.
- **Post attribution**: When `organiser_profile_id` is set on a post, the feed displays the organiser's name/avatar instead of the personal profile.

## RSVP Capacity Enforcement

RSVP join/leave operations use atomic Postgres functions (`rsvp_join`, `rsvp_leave`) with:
- `FOR UPDATE` row-level locking on the events table
- UNIQUE constraint on `(event_id, user_id)` preventing duplicates
- Composite index on `(event_id, status)` for fast capacity counts
- `SECURITY DEFINER` with internal auth + access checks
- Execution restricted to `authenticated` role only (revoked from `anon` and `public`)

## Event Ordering Convention

- **Upcoming events**: Sorted ascending by `event_date` (soonest first)
- **Past events**: Sorted descending by `event_date` (most recent first)

## Environment Support

Config is resolved from `VITE_*` env vars with dev/staging/prod awareness via `src/infrastructure/config.ts`.
