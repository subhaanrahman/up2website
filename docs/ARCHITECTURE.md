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
    ├── rsvp/           # Atomic RSVP join/leave via DB functions
    ├── events-create/  # Event creation
    ├── loyalty-award-points/
    ├── settings-upsert/
    ├── profile-update/
    ├── referrals-track/
    ├── orders-reserve/ # Stub
    ├── payments-intent/# Stub
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

## RSVP Capacity Enforcement

RSVP join/leave operations use atomic Postgres functions (`rsvp_join`, `rsvp_leave`) with:
- `FOR UPDATE` row-level locking on the events table
- UNIQUE constraint on `(event_id, user_id)` preventing duplicates
- Composite index on `(event_id, status)` for fast capacity counts
- `SECURITY DEFINER` with internal auth + access checks
- Execution restricted to `authenticated` role only (revoked from `anon` and `public`)

## Environment Support

Config is resolved from `VITE_*` env vars with dev/staging/prod awareness via `src/infrastructure/config.ts`.
