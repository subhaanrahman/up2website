# Up2 — Developer Context & Coding Standards

> Last updated: 2026-03-16
> This document is the human-readable companion to `.cursor/rules/dev-context.mdc`, which is auto-loaded by Cursor AI agents.

---

## Quick Reference — What NOT to Do

| Rule | Wrong | Right |
|------|-------|-------|
| Supabase import | `import { supabase } from '@/integrations/supabase/client'` | `import { supabase } from '@/infrastructure/supabase'` |
| DB access in page/hook | `supabase.from('posts').insert(...)` | `postsRepository.createPost(...)` |
| Edge function logging | `console.error('failed', err)` | `edgeLog('error', 'failed', { requestId, error: err.message })` |
| Edge function response | `new Response(JSON.stringify({ error }), ...)` | `errorResponse(500, 'message', { requestId })` |
| CORS headers | `const corsHeaders = { ... }` (local) | `import { corsHeaders } from '../_shared/response.ts'` |
| Sensitive write | Direct `supabase.from('blocked_users').insert(...)` | `callEdgeFunction('moderation-block', { body: { blocked_user_id } })` |
| Logging in repo | No logging on write methods | `log.info('createPost', { authorId })` via `createLogger` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Pages / Components / Hooks                          │
│  (React, no direct DB access)                        │
├─────────────────────────────────────────────────────┤
│  Services                    │  callEdgeFunction()   │
│  (business logic,            │  (sensitive writes)    │
│   calls repositories)        │                        │
├─────────────────────────────────────────────────────┤
│  Repositories                                        │
│  (all supabase.from() calls live here)               │
│  src/features/*/repositories/*Repository.ts          │
├─────────────────────────────────────────────────────┤
│  Infrastructure                                      │
│  supabase.ts │ api-client.ts │ logger.ts │ errors.ts │
├─────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL + Auth + Storage + Realtime)   │
│  Edge Functions (42 endpoints, Deno runtime)          │
└─────────────────────────────────────────────────────┘
```

---

## Repositories (11 total)

All repositories are under `src/features/*/repositories/`. Every write method has structured logging via `createLogger`. Sensitive writes are routed through edge functions via `callEdgeFunction`.

| Repository | Domain | Key Methods |
|-----------|--------|-------------|
| **identityRepository** | identity | `getProfile` (with dev-login fallback) |
| **eventsRepository** | events | `list`, `search`, `getById`, `saveEvent`, `unsaveEvent`, `getEventSummariesByIds` |
| **eventManagementRepository** | events | `joinWaitlist`, `insertCohosts`, `insertMedia`→edge, `deleteMedia`→edge, `upsertTicketTiers` |
| **postsRepository** | social | `createPost`, `deletePost`, `reportPost`→edge, `blockUser`→edge |
| **connectionsRepository** | social | `sendRequest`, `acceptById`, `followOrganiser`, `unfollowOrganiser` |
| **profilesRepository** | social | `searchProfiles`, `searchOrganisers`, `getProfilesByIds`, `getOrganisersByIds` |
| **organiserTeamRepository** | social | `inviteMember`→edge, `removeMember`→edge, `updateRole`→edge |
| **messagingRepository** | messaging | `sendGroupMessage`→edge, `sendDm`→edge, `addGroupMembers`→edge, `removeGroupMember`→edge |
| **supportRepository** | support | `submitContactMessage` |
| **loyaltyRepository** | loyalty | `getUserPoints`, `getVouchers`, `getTransactions`, `subscribeToPoints` |
| **notificationsRepository** | notifications | `deleteNotification` |

---

## Edge Functions (42 total)

All edge functions live in `supabase/functions/*/index.ts` and use shared helpers from `supabase/functions/_shared/`:

- **`logger.ts`** — `edgeLog(level, message, context)` for structured JSON logging
- **`response.ts`** — `corsHeaders`, `getRequestId(req)`, `errorResponse()`, `successResponse()`
- **`queue.ts`** — In-process job queue with retry
- **`rate-limit.ts`** — DB-backed sliding window rate limiter
- **`password.ts`** — PBKDF2 password hashing
- **`avatar.ts`** — Initials avatar generation

### Standardized patterns for every edge function:
1. CORS preflight handling
2. `const requestId = getRequestId(req)` at the top
3. JWT authentication from `Authorization` header
4. Input validation (Zod or manual)
5. All logging via `edgeLog` (never `console.*`)
6. `errorResponse(status, message, { requestId })` for errors
7. `successResponse(data, requestId)` for success

### Error envelope format
```json
{ "error": "Human message", "code": "MACHINE_CODE", "request_id": "abc123", "details": {} }
```

### Actor context (organiser vs personal)

When a user can act as either a personal profile or an organiser profile (via ActiveProfileContext):

- **Posts:** `organiser_profile_id` set when posting as organiser; `null` when personal.
- **Notifications:** `organiser_profile_id` set when notification is organiser-scoped; `null` for personal.
- **Edge functions:** Pass `organiser_profile_id` in body when the action is performed as an organiser (e.g. `notifications-send`, post creation).
- **Tables with actor columns:** `posts`, `notifications`, `dm_threads`, `event_cohosts`, `events`.

---

## Request Correlation Flow

```
Client                          Edge Function
  │                                  │
  │  X-Request-ID: abc123            │
  │ ─────────────────────────────────>│
  │                                  │ const requestId = getRequestId(req)
  │                                  │ edgeLog('info', '...', { requestId })
  │                                  │
  │  { data, request_id: "abc123" }  │
  │ <─────────────────────────────────│
  │                                  │
  │ parseApiError extracts           │
  │ request_id for debugging         │
```

---

## Payment Flow

```
EventDetail → Checkout → orders-reserve → payments-intent → Stripe Elements
    → stripe.confirmPayment() → stripe-webhook → confirm order + issue tickets
```

- **Webhook** (`stripe-webhook`) is the ONLY place orders get confirmed and tickets get issued
- **Idempotency** via `payment_events.stripe_event_id` unique constraint
- **Service fee:** 7% on top of ticket price, retained by platform
- **Organiser receives** full ticket price via Stripe Connect destination charge
- **Never** trust client-sent amounts — all pricing from `ticket_tiers` server-side

---

## Auth Flow

```
Phone input → check-phone (edge) → send-otp (edge) → verify-otp (edge)
  → returning user? → login (edge) → setSession
  → new user? → register (edge) → setSession + auto-create profile + initials avatar
```

All auth operations go through edge functions. The client never touches `auth.users` directly.

---

## Actor Context (Profile Switching)

Users can switch between personal and organiser profiles. The active profile determines attribution.

- **Personal:** `organiser_profile_id = null`
- **Organiser:** `organiser_profile_id = <active org profile id>`
- **Edge functions** that accept organiser context validate ownership before acting
- **`ActiveProfileContext`** (`src/contexts/ActiveProfileContext.tsx`) manages the switch
- Documented in Section 5 of `.cursor/rules/dev-context.mdc`

---

## Known Issues (Intentional — Do Not "Fix" Without Discussion)

1. `is_profile_public()` returns `true` always — privacy enforcement is planned
2. `authorization.ts` in frontend is dead code — edge functions do inline auth
3. `src/infrastructure/queue.ts` is unused — reserved for Cloud Tasks migration
4. `feedService.ts` does direct Supabase queries for core post fetching
5. Some hooks still have direct `supabase.from()` reads — do not add more
6. `orders` feature module is empty scaffold — logic in hooks + edge functions
7. Dual feed systems coexist — consolidation planned

---

## Commit Checklist

Before committing any code change:

- [ ] No new `supabase.from()` in pages, components, or hooks
- [ ] No new `@/integrations/supabase/client` imports in app code
- [ ] New edge functions use all shared helpers (`edgeLog`, `getRequestId`, `errorResponse`, `successResponse`)
- [ ] No `console.log`/`console.error` in edge functions
- [ ] New repo write methods have `createLogger` logging
- [ ] Sensitive writes routed through edge functions
- [ ] `npx tsc --noEmit` passes

---

## Key Docs Reference

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | Full platform architecture (routes, DB, edge functions, risks) |
| `docs/DATABASE_ARCHITECTURE.md` | Schema deep-dive (46 tables, RPCs, RLS, indexes) |
| `docs/PLATFORM_TODOS.md` | Consolidated todos (pre-launch, backend, Stripe, optimisation, API, cleanup) |
| `docs/SECURITY_CHECKLIST.md` | Which tables are locked, which are edge-only, which are client-writable |
| `docs/GAMIFICATION_OPTIONS.md` | Points, ranks, badges roadmap |

---

*Last updated: 16 March 2026*
