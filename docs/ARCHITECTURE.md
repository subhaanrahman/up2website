# Architecture Overview

> Last updated: 2026-03-10

Social Soirée is a mobile-first event discovery, ticketing, and social platform built with **React + Vite + TypeScript + Tailwind CSS** on the frontend and **Supabase (Postgres + Edge Functions + Storage + Auth)** on the backend via Lovable Cloud.

---

## Table of Contents

1. [Modular Monolith](#modular-monolith)
2. [Directory Structure](#directory-structure)
3. [Import Rules](#import-rules)
4. [Data Flow](#data-flow)
5. [Authentication & Identity](#authentication--identity)
6. [Profile System](#profile-system)
7. [Events & RSVPs](#events--rsvps)
8. [Ticketing & Payments](#ticketing--payments)
9. [Loyalty & Gamification](#loyalty--gamification)
10. [Social & Feed](#social--feed)
11. [Messaging](#messaging)
12. [Notifications](#notifications)
13. [Navigation & Routing](#navigation--routing)
14. [Infrastructure](#infrastructure)
15. [Database Schema](#database-schema)
16. [Edge Functions](#edge-functions)
17. [Storage](#storage)
18. [Security](#security)
19. [Environment & Config](#environment--config)

---

## Modular Monolith

The codebase follows a **modular monolith** pattern with strict feature boundaries. Each feature module exposes a public API via its `index.ts` barrel file.

### Feature Modules

| Module | Status | Exports |
|--------|--------|---------|
| `identity` | ✅ Active | `identityService`, `identityRepository`, `UserProfile`, `UpdateProfileInput` |
| `events` | ✅ Active | `eventsService`, `eventsRepository`, `EventEntity`, `CreateEventInput`, `UpdateEventInput`, `Rsvp`, `EventFilter`, `EventCategory`, `EVENT_CATEGORIES` |
| `loyalty` | ✅ Active | `loyaltyService`, `loyaltyRepository`, all domain types (`UserRank`, `PointAction`, `Voucher`, etc.) |
| `social` | ✅ Active | `getSuggestedFriends`, `buildFeedContext`, `fetchFeedPage`, `fetchPublicFeedPage`, `fetchNearbyEvents` |
| `orders` | 🔲 Scaffold | Empty — order logic handled via Edge Functions and webhook-driven state machine |
| `notifications` | ✅ Active | `useNotifications`, `useUnreadCount`, `useMarkNotificationRead`, `useMarkAllRead` |

---

## Directory Structure

```
src/
├── api/                    # Client API wrappers (thin layer calling Edge Functions for writes)
│   └── index.ts            # loyaltyApi, eventsApi, rsvpApi, settingsApi, profileApi, referralsApi
├── components/             # Shared UI components
│   ├── ui/                 # shadcn/ui primitives (button, dialog, sheet, etc.)
│   ├── auth/               # Auth step components (PhoneStep, OtpStep, PasswordStep, RegisterStep)
│   ├── create-event/       # Event creation sub-panels
│   ├── notifications/      # NotificationItem
│   └── organiser-dashboard/# Dashboard sub-components
├── contexts/
│   ├── AuthContext.tsx      # Auth state, phone+password login, OTP, register, dev-login
│   └── ActiveProfileContext.tsx  # Personal ↔ organiser profile switching
├── features/               # Domain modules (see above)
│   ├── identity/           # Auth, session, profiles
│   │   ├── domain/types.ts
│   │   ├── repositories/identityRepository.ts
│   │   └── services/identityService.ts, authorization.ts
│   ├── events/             # Events, RSVP, search
│   │   ├── domain/types.ts
│   │   ├── repositories/eventsRepository.ts
│   │   └── services/eventsService.ts
│   ├── loyalty/            # Points, ranks, vouchers
│   │   ├── domain/types.ts
│   │   ├── repositories/loyaltyRepository.ts
│   │   └── services/loyaltyService.ts
│   ├── social/             # Feed, recommendations
│   │   └── services/feedService.ts, recommendationService.ts
│   ├── orders/             # Scaffold
│   └── notifications/      # Re-exports from hooks
├── hooks/                  # React Query hooks (server-state management)
├── infrastructure/         # Config, logging, errors, supabase client, queue
│   ├── api-client.ts       # Generic Edge Function caller with auth token
│   ├── config.ts           # VITE_* env resolution
│   ├── errors.ts           # AppError hierarchy
│   ├── logger.ts           # Structured JSON logging
│   ├── queue.ts            # In-memory queue (frontend)
│   └── supabase.ts         # Re-export of auto-generated client
├── lib/                    # Utility functions (calendar, image, stripe, gamification)
├── pages/                  # Route-level page components (~45 pages)
└── data/                   # Static data (cities, mock events)

supabase/
├── config.toml             # Auto-managed Supabase config
└── functions/              # Edge Functions (40+ endpoints)
    ├── _shared/            # Shared: avatar.ts, password.ts, rate-limit.ts, queue.ts, job-handlers.ts
    └── [function-name]/    # Individual edge functions
```

---

## Import Rules

| Layer | May Import | Must NOT Import |
|-------|-----------|-----------------|
| Pages / Components | Services, `src/api`, hooks, contexts | Repositories, Supabase client |
| Services | Repositories | Supabase client directly |
| Repositories | `infrastructure/supabase` | Services, API wrappers |
| `src/api` wrappers | `infrastructure/api-client` | Repositories, Services |
| Edge Functions | `_shared/*`, Deno std, Supabase SDK | Frontend code |

---

## Data Flow

```
Reads:  UI → React Query hook → Service → Repository → Supabase (direct client read)
Writes: UI → React Query mutation → src/api wrapper → Edge Function → DB (via RPC or direct)
```

- **Reads** are direct Supabase client queries, filtered by RLS policies.
- **Writes** always go through Edge Functions for server-side validation, authorization, and side effects (notifications, loyalty points, etc.).

---

## Authentication & Identity

### Phone-Primary Auth
- Authentication is **strictly phone-primary** using Supabase Auth with `signInWithPassword`.
- Users register with phone + password + name + username.
- Phone numbers use internal `@phone.local` email identifiers within Supabase Auth.
- OTP verification via Twilio Verify (send-otp / verify-otp edge functions).
- Email is optional and verified separately via `email-verify-send` / `email-verify-confirm`.

### Auth Flow
1. **Check Phone** → `check-phone` edge function (does phone exist?)
2. **Send OTP** → `send-otp` (Twilio Verify)
3. **Verify OTP** → `verify-otp` (confirms phone ownership)
4. **Register** → `register` edge function (creates auth user + profile + initials avatar)
5. **Login** → `login` edge function (password auth, lazy PBKDF2 migration)

### Auth Context (`AuthContext.tsx`)
- Provides: `user`, `session`, `loading`, `checkPhone`, `sendOtp`, `verifyOtp`, `register`, `login`, `signOut`, `devLogin`
- Deduplication guard prevents double `onAuthStateChange` + `getSession` updates.
- Public endpoints (`check-phone`, `login`, `register`, `send-otp`, `verify-otp`, `dev-login`, `health`) skip `getSession()` for ~100-200ms latency savings.

### Login Performance (3-Phase Bootstrap)
- **Phase A (Auth)**: Skip redundant session calls; one-time PBKDF2 migration check.
- **Phase B (Session)**: Dedup guard prevents double auth state updates.
- **Phase C (Bootstrap)**: Parallelizes organiser profile + membership queries. Gamification data is deferred/non-blocking.

---

## Profile System

### Three-Tier Identity Model

| Tier | Description | Public | Dashboard |
|------|-------------|--------|-----------|
| **Personal** | Mandatory, always exists | No (private) | No |
| **Professional** | Upgraded personal (DJ, Artist, Promoter) | Yes | No |
| **Business/Organiser** | Separate entity with management tools | Yes | Yes |

- **Personal profiles** (`profiles` table): Linked to `auth.users` via `user_id`. Always have an `avatar_url` (initials SVG generated on registration).
- **Professional profiles**: Same `profiles` row with `profile_tier = 'professional'` and a `page_classification`. Toggled via Settings.
- **Organiser profiles** (`organiser_profiles` table): Separate entities owned by a user (`owner_id`). Support teams via `organiser_members`.

### Active Profile Context (`ActiveProfileContext.tsx`)
- Manages switching between personal and organiser identities via long-press gesture on profile tab.
- Persists selection in `localStorage`.
- Auto-syncs metadata (display name, avatar) when underlying profile data changes.
- Fetches owned profiles AND accepted memberships in parallel on init.
- Posts, events, and feed attribution respect the active profile.

### Profile Visibility
- `is_profile_public` database function controls visibility.
- Personal profiles are always private; Professional/Business are public.
- Privacy settings table controls granular sharing (going events, saved events).

---

## Events & RSVPs

### Event Lifecycle
1. **Create**: Via `events-create` edge function. Supports scheduled publishing (`publish_at`).
2. **Edit**: Via `events-update` edge function. Host-only authorization.
3. **Cancel/Delete**: Via `events-update` with `action: 'delete'`. Host-only.
4. **Multi-day**: `event_date` + `end_date` range support.
5. **Co-hosts**: `event_cohosts` table supports personal profiles and organiser accounts as co-hosts.

### RSVP System
- Atomic Postgres functions: `rsvp_join(event_id, status, guest_count)` and `rsvp_leave(event_id)`.
- `FOR UPDATE` row-level locking prevents race conditions.
- `UNIQUE(event_id, user_id)` constraint prevents duplicates.
- Composite index on `(event_id, status)` for fast capacity counts.
- `SECURITY DEFINER` with internal auth + access checks.
- Guest counts: +1 to +5, clamped server-side.
- Private events require host or invite membership.

### Capacity & Waitlist
- When capacity is reached, new RSVPs are blocked.
- Waitlist table tracks user position and manages notifications when spots open.

### Event Search & Filters
- Filters: `all`, `tonight`, `thisWeek`, `thisMonth`, `free`
- Categories: `party`, `music`, `networking`, `food`, `sports`, `arts`, `charity`, `festival`, `comedy`, `other`
- City-based filtering via location `ilike`.
- Free events filter: `ticket_price_cents = 0` AND no paid ticket tiers.

### Event Ordering
- **Upcoming events**: Ascending by `event_date` (soonest first).
- **Past events**: Descending by `event_date` (most recent first).

### Guestlist
- Optional guestlist with approval workflow (`guestlist_enabled`, `guestlist_require_approval`).
- Deadline enforcement (`guestlist_deadline`).
- Separate max capacity (`guestlist_max_capacity`).

---

## Ticketing & Payments

### Stripe Connect Marketplace
- **Model**: Destination charges with Express Connect accounts.
- **Pricing**: `ticket_price + 7% service_fee`. Organiser receives full ticket price; platform retains `application_fee_amount`.
- **Onboarding**: `stripe-connect-onboard` generates account links. `stripe-connect-status` checks `charges_enabled` and `payouts_enabled` via Stripe API.
- **Hard Block**: Paid ticket creation disabled until organiser completes Stripe onboarding.

### Ticket Tiers
- `ticket_tiers` table: name, price_cents, available_quantity, sort_order per event.
- Managed by event host via RLS policies.

### Order Lifecycle (Webhook-Driven)
1. `orders-reserve` → Creates order with 15-min expiry, `status = 'reserved'`.
2. `payments-intent` → Creates Stripe PaymentIntent with destination charge.
3. `stripe-webhook` monitors:
   - `payment_intent.succeeded` → Confirms order, issues tickets, auto-RSVPs, awards points.
   - `payment_intent.payment_failed` → Marks order failed.
   - `charge.refunded` → Processes refund.
4. Inventory tracking: Server-side `SUM(quantity)` prevents overselling.

### Discount Codes
- Per-event discount codes with percentage/fixed amount types.
- Ticket limit controls (unlimited, per-code, per-user).
- Optional hidden ticket reveal capability.
- Validation via `validate-discount` edge function.

### Ticket Features
- QR code per ticket for check-in.
- Transfer support via `ticket-transfer` edge function.
- Check-in via `checkin-toggle` edge function (manual toggle or QR scan).

---

## Loyalty & Gamification

### Points System
- Server-side `award_points` Postgres function (SECURITY DEFINER).
- Row-level locking prevents race conditions on point updates.

### Point Actions & Values
| Action | Points |
|--------|--------|
| `add_friend` | 5 |
| `save_event` | 5 |
| `like_post` | 5 |
| `follow_organiser` | 10 |
| `share_event` | 10 |
| `rsvp_event` | 25 |
| `buy_ticket` | 50 |
| `create_event` | 50 |
| `app_review` | 50 |

### Rank Tiers
| Rank | Threshold |
|------|-----------|
| Bronze | 0 |
| Silver | 1,000 |
| Gold | 2,000 |
| Platinum | 3,000 |
| Diamond | 4,000 |

### Rewards
- Automatic voucher issuance on rank-up: `REWARD-{uuid}`, 500 cents value, 90-day expiry.
- `user_vouchers` table tracks availability, usage, and expiration.

### Gamification Context
- `GamificationProvider` wraps app, loads points/vouchers/transactions in parallel.
- Non-blocking on initial load (starts with `loading = false`).
- Real-time subscription to point changes via Supabase Realtime (where enabled).

---

## Social & Feed

### Feed Algorithm (v1 Deterministic)
Five source buckets ranked by weight:
1. **Friends/followed users posts** (weight 100)
2. **Followed organiser profile posts** (weight 80)
3. **Reposts by friends** (weight 60)
4. **Organisers that friends follow** (weight 40)
5. **Public content fallback** (weight 10)

Within each bucket: newest-first. Final sort: weight DESC, then recency DESC.
Designed to be swapped for ML-backed scoring later.

### Friend Recommendations
- Current: Most recently created profiles, excluding self and existing connections.
- Future: Mutual-friend scoring, event co-attendance, city proximity.

### Posts
- Content types: text, image, GIF (via `gif-search` edge function).
- Post attribution respects active profile (personal or organiser).
- Collaborators via `post_collaborators` table.
- Reactions: `post_likes` with `reaction_type` field.
- Reposts: `post_reposts` table.
- Validation trigger: Must have content, image, or GIF.

### Connections (Friends)
- Request/accept model via `connections` table.
- Statuses: `pending`, `accepted`.
- Mute support per connection.
- Mutual friends via `get_mutual_friends` database function.
- Block support via `blocked_users` table.

---

## Messaging

### Architecture
- **Group Chats**: 3+ members, available to personal and professional accounts.
  - `group_chats` → `group_chat_members` → `group_chat_messages`.
  - Membership checked via `is_group_chat_member` function.
- **Direct Messages (DMs)**: User ↔ Business/Organiser only.
  - `dm_threads` → `dm_messages`.
  - Thread scoped to `user_id` + `organiser_profile_id`.
  - Access: thread user OR organiser owner/member.

### Message Alignment
- Determined by comparing `sender_id` to authenticated user ID (own messages on right).

### Dashboard Views
- **Organisers section**: User-to-organiser DMs.
- **Inbox**: Organiser incoming messages.
- **Broadcast Channels**: Coming soon.

---

## Notifications

### System
- `notifications` table with auto-expiry (20-day default via `expires_at`).
- Types: general, event, social, etc.
- Rich metadata: `avatar_url`, `event_image`, `link`, `organiser_profile_id`.
- Cleanup via `purge_expired_notifications` function.

### Settings
- Per-user `notification_settings` table.
- Granular toggles: push, email, event reminders, friend activity, new events, promotions, messages, mentions.

### Processing
- `notifications-send` edge function for individual notifications.
- `notifications-process` for batch processing.
- Routed through queue abstraction for future Cloud Tasks migration.

---

## Navigation & Routing

### Mobile (5-Tab Bottom Nav)
| Tab | Route | Label | Notes |
|-----|-------|-------|-------|
| 1 | `/` | Home | Feed |
| 2 | `/search` | Search | Event discovery |
| 3 | `/events` | Events/Dashboard | Switches to "Dashboard" for organiser profiles |
| 4 | `/messages` | Messages | Group chats + DMs |
| 5 | `/profile` | Profile | Long-press for profile switching |

### Desktop
- Vertical left sidebar replaces bottom nav.
- Feed stays centered.

### Route Categories
- **Public**: `/`, `/auth`, `/search`, `/search/:id`, `/user/:userId`, `/terms`, `/privacy`, `/events/:id`, `/embed/:id`
- **Protected**: Everything else (wrapped in `<ProtectedRoute>`)
- **Event Management**: `/events/:id/manage`, `/events/:id/checkin`, `/events/:id/analytics`, `/events/:id/edit`
- **Settings**: `/settings/*` (notifications, privacy, help, about, account, music, contact, email-verification, payment-methods)

---

## Infrastructure

### API Client (`api-client.ts`)
- Generic `callEdgeFunction<T>(name, options)` — attaches auth token, parses errors.
- Public functions set skips `getSession()` for performance.
- Returns typed responses.

### Error Hierarchy (`errors.ts`)
```
AppError (base)
├── ValidationError (400)
├── AuthError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
└── ApiError (generic HTTP error)
```
`parseApiError()` converts Edge Function JSON errors into typed `AppError` instances.

### Logger (`logger.ts`)
- Structured JSON logging with context namespaces.
- Dev: readable console output. Prod: JSON strings.
- Levels: debug, info, warn, error.

### Queue Abstraction
- **Frontend** (`src/infrastructure/queue.ts`): In-memory `QueueAdapter` with handler registry.
- **Edge Functions** (`supabase/functions/_shared/queue.ts`): In-process execution with retry (max 3 attempts).
- Both designed for single-file swap to Cloud Tasks.

### Job Types
`notification.send`, `notification.process_batch`, `loyalty.award_points`, `loyalty.rank_up_voucher`, `rsvp.auto_mark_going`, `tickets.issue`, `referral.track`, `cleanup.expired_orders`, `cleanup.expired_notifications`

---

## Database Schema

### Core Tables (30+)

| Table | Purpose |
|-------|---------|
| `profiles` | Personal user profiles (linked to `auth.users` via `user_id`) |
| `organiser_profiles` | Business/organiser profiles (owned via `owner_id`) |
| `organiser_members` | Team membership with roles (editor, etc.) and invite status |
| `organiser_followers` | User follows for organiser profiles |
| `organiser_stripe_accounts` | Stripe Connect account linkage |
| `events` | Event listings with full metadata |
| `event_cohosts` | Co-host assignments (personal or organiser) |
| `event_media` | Additional event media files |
| `event_messages` | Event chat/discussion |
| `event_reminders` | Configurable reminder types |
| `rsvps` | RSVP records with guest counts |
| `saved_events` | User-saved/bookmarked events |
| `waitlist` | Capacity overflow waitlist |
| `invites` | Event invitations |
| `ticket_tiers` | Ticket pricing tiers per event |
| `tickets` | Issued tickets with QR codes |
| `orders` | Order records with Stripe integration |
| `discount_codes` | Per-event discount codes |
| `payment_events` | Stripe webhook audit log |
| `refunds` | Refund tracking |
| `posts` | Social feed posts |
| `post_likes` | Reactions with type |
| `post_reposts` | Repost records |
| `post_collaborators` | Post co-authors |
| `connections` | Friend request/accept model |
| `blocked_users` | User blocks |
| `dm_threads` | Direct message threads (user ↔ organiser) |
| `dm_messages` | DM content |
| `group_chats` | Group chat rooms |
| `group_chat_members` | Group membership |
| `group_chat_messages` | Group messages |
| `notifications` | In-app notifications with expiry |
| `notification_settings` | Per-user notification preferences |
| `privacy_settings` | Per-user privacy controls |
| `user_points` | Loyalty points and rank |
| `point_transactions` | Point earning history |
| `user_vouchers` | Reward vouchers |
| `user_badges` | Achievement badges |
| `user_roles` | Admin roles (super_admin, moderator, support) |
| `user_music_connections` | Music service integrations |
| `contact_messages` | Contact form submissions |
| `reports` | Content/user reports |
| `moderation_actions` | Admin action audit log |
| `support_requests` | Help desk tickets |
| `rate_limits` | API rate limiting |
| `check_ins` | Event check-in records |

### Enums
- `app_role`: `super_admin`, `moderator`, `support`
- `user_rank`: `bronze`, `silver`, `gold`, `platinum`, `diamond`

### Key Database Functions
| Function | Purpose |
|----------|---------|
| `rsvp_join` / `rsvp_leave` | Atomic RSVP with capacity locking |
| `award_points` | Points + rank calculation + voucher issuance |
| `has_role` / `is_admin` | Role-based access checks (SECURITY DEFINER) |
| `is_organiser_owner` / `is_organiser_member` | Organiser authorization |
| `is_group_chat_member` | Chat access control |
| `is_profile_public` | Profile visibility check |
| `get_mutual_friends` | Mutual friend lookup |
| `get_friend_count` / `get_friends_and_following_count` | Social counts |
| `get_organiser_*_count` | Organiser analytics (followers, attendees, past events) |
| `get_personal_combined_event_count` | Personal event history count |
| `get_group_chat_member_profiles` | Chat member info |
| `check_rate_limit` | Rate limiting with sliding window |
| `purge_expired_notifications` | Notification cleanup |
| `handle_new_user` | Trigger: auto-create profile on auth signup |
| `validate_post_content` | Trigger: ensure post has content/image/GIF |

---

## Edge Functions

### 40+ Endpoints

| Category | Functions |
|----------|-----------|
| **Auth** | `check-phone`, `send-otp`, `verify-otp`, `login`, `register`, `dev-login`, `dev-profile` |
| **Profile** | `profile-update`, `avatar-upload`, `backfill-avatars`, `account-delete` |
| **Email** | `email-verify-send`, `email-verify-confirm` |
| **Events** | `events-create`, `events-update` |
| **RSVP** | `rsvp` (join/leave via action param) |
| **Organiser** | `organiser-profile-create`, `organiser-profile-update` |
| **Ticketing** | `orders-reserve`, `orders-list`, `validate-discount`, `ticket-transfer`, `checkin-toggle` |
| **Payments** | `payments-intent`, `stripe-connect-onboard`, `stripe-connect-status`, `stripe-connect-dashboard`, `stripe-webhook` |
| **Social** | `attendee-broadcast`, `referrals-track`, `report-create`, `gif-search` |
| **Loyalty** | `loyalty-award-points` |
| **Notifications** | `notifications-send`, `notifications-process` |
| **Settings** | `settings-upsert` |
| **Support** | `support-request-create` |
| **Analytics** | `dashboard-analytics` |
| **Infra** | `health` |

### Shared Utilities (`_shared/`)
- `avatar.ts` — Initials SVG generation
- `password.ts` — PBKDF2 password hashing/verification (legacy migration)
- `rate-limit.ts` — Rate limiting via `check_rate_limit` DB function
- `queue.ts` — In-process job queue with retry
- `job-handlers.ts` — Handler registry for queue job types

---

## Storage

### Buckets (all public)
| Bucket | Purpose |
|--------|---------|
| `avatars` | Profile and organiser avatar images |
| `post-images` | Social feed post images |
| `event-flyers` | Event cover images |
| `event-media` | Additional event media (gallery) |

---

## Security

### Row-Level Security (RLS)
- Enabled on ALL tables.
- Patterns:
  - **Own data**: `auth.uid() = user_id` for personal CRUD.
  - **Host authorization**: `EXISTS (SELECT 1 FROM events WHERE host_id = auth.uid())` for event management.
  - **Organiser authorization**: `is_organiser_owner()` / `is_organiser_member()` functions.
  - **Admin access**: `is_admin()` / `has_role()` SECURITY DEFINER functions.
  - **No client writes**: `false` policies on sensitive tables (user_roles, moderation_actions, organiser_stripe_accounts writes).
  - **Public reads**: Events with `is_public = true`, organiser profiles for authenticated users.

### Admin & Moderation
- Roles stored in separate `user_roles` table (never on profiles).
- `app_role` enum: `super_admin`, `moderator`, `support`.
- Reports system: users, posts, events with status tracking.
- Immutable `moderation_actions` audit log (no client writes).
- Support requests with category and resolution tracking.

### Rate Limiting
- Database-backed sliding window rate limiter.
- Per-user and per-IP tracking.
- Configurable window and max requests per endpoint.
- Auto-cleanup of expired windows (5% probabilistic trigger).

### Edge Function Authorization
- Service role client used for operations requiring elevated access.
- Manual authorization checks before data access.
- Host/organiser verification before returning protected data.

---

## Environment & Config

### Frontend Config (`src/infrastructure/config.ts`)
```typescript
config.env          // 'development' | 'staging' | 'production'
config.supabase.url // VITE_SUPABASE_URL
config.supabase.anonKey  // VITE_SUPABASE_PUBLISHABLE_KEY
config.supabase.projectId // VITE_SUPABASE_PROJECT_ID
config.functionsUrl // ${supabase.url}/functions/v1
config.isDev / config.isProd
```

### Edge Function Secrets
| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | DB access |
| `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` | Client-facing keys |
| `SUPABASE_DB_URL` | Direct DB connection |
| `STRIPE_SECRET_KEY` | Stripe server-side API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID` | Phone OTP |
| `LOVABLE_API_KEY` | Lovable AI integration |

### Key Dependencies
- **React 18** + **React Router 6** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** + **tailwindcss-animate**
- **shadcn/ui** (Radix primitives)
- **@tanstack/react-query** (server state)
- **@supabase/supabase-js** (DB client)
- **@stripe/stripe-js** + **@stripe/react-stripe-js** (payments)
- **date-fns** (date utilities)
- **recharts** (analytics charts)
- **react-hook-form** + **zod** (form validation)
- **lucide-react** (icons)
- **sonner** (toast notifications)
- **qrcode.react** (QR code generation)
- **html-to-image** (screenshot/export)
- **react-international-phone** (phone input)
- **vaul** (drawer)
