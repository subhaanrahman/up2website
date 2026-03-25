# Up2 Platform — Database Architecture

> Last updated: 2026-03-24  
> Companion to `docs/ARCHITECTURE.md` — deep-dive into the PostgreSQL schema, relationships, RLS policies, and future table plans.  
> **Performance:** [Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md](Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md) (Disk IO incidents, slow queries, indexes). **Hosting / region moves:** [supabase/MIGRATION_AND_HOSTING.md](supabase/MIGRATION_AND_HOSTING.md). **Hosted DB (Sydney):** project `fxcosnsbaaktblmnvycv` — schema via `supabase db push`; optional legacy `public` data via [`scripts/region-migration/apply-public-data.sh`](../scripts/region-migration/apply-public-data.sh).

---

## 1. Overview

- **Engine**: PostgreSQL (via Supabase / Lovable Cloud)
- **Schema**: All tables in `public` schema
- **Auth**: Supabase Auth (`auth.users`) — profiles linked via `user_id` foreign key pattern
- **Total tables**: 46
- **Enums**: `app_role` (super_admin, moderator, support), `user_rank` (bronze, silver, gold, platinum, diamond)
- **Extensions**: `pg_cron`, `pg_net` (for scheduled jobs)
- **Entry paths (conceptual):** **Guestlist / RSVP** rows (`rsvps`, waitlist, approvals) are separate from **paid tickets** (`orders`, `tickets`, `ticket_tiers`) and **VIP table reservations** (`vip_table_reservations`, `vip_table_tiers`). See [PLATFORM_TODOS.md](PLATFORM_TODOS.md) (Guestlist vs VIP).

### `events` — ticket refund policy (2026-03)

Organiser-configurable fields (migration `20260321120000_event_refund_policy.sql`):

| Column | Purpose |
|--------|---------|
| `refunds_enabled` | When true, buyers may call `refunds-request-self` for confirmed orders (subject to timing). |
| `refund_policy_text` | Optional copy surfaced on event detail / ticketing UX. |
| `refund_deadline_hours_before_event` | Optional cutoff: refunds only until `event_date` minus *N* hours; `NULL` means “until event starts”. |

---

## 2. Entity-Relationship Diagram (Conceptual)

```
auth.users (managed by Supabase)
  │
  ├── profiles (1:1 via user_id)
  │     ├── connections (friend graph)
  │     ├── blocked_users
  │     ├── privacy_settings (1:1)
  │     ├── notification_settings (1:1)
  │     ├── user_points (1:1, loyalty)
  │     ├── user_badges (1:N)
  │     ├── user_vouchers (1:N)
  │     ├── user_music_connections (1:N)
  │     └── user_roles (1:N, admin)
  │
  ├── organiser_profiles (1:N via owner_id)
  │     ├── organiser_members (team)
  │     ├── organiser_followers (1:N)
  │     ├── organiser_stripe_accounts (1:1)
  │     └── events (via organiser_profile_id)
  │
  ├── events (via host_id)
  │     ├── rsvps (N:M users↔events)
  │     ├── ticket_tiers (1:N)
  │     │     └── orders (1:N)
  │     │           ├── tickets (1:N)
  │     │           ├── refunds (1:N)
  │     │           └── payment_events (audit)
  │     ├── event_cohosts (1:N)
  │     ├── event_media (1:N)
  │     ├── event_messages (1:N, attendee chat)
  │     ├── event_reminders (1:N)
  │     ├── saved_events (1:N)
  │     ├── waitlist (1:N)
  │     ├── invites (1:N)
  │     └── discount_codes (1:N)
  │     └── check_ins (1:N)
  │
  ├── posts (via author_id)
  │     ├── post_likes (1:N)
  │     ├── post_reposts (1:N)
  │     └── post_collaborators (1:N)
  │
  ├── dm_threads (user ↔ organiser)
  │     └── dm_messages (1:N)
  │
  ├── group_chats
  │     ├── group_chat_members (1:N)
  │     └── group_chat_messages (1:N)
  │
  └── infrastructure
        ├── notifications (1:N per user)
        ├── reports
        ├── moderation_actions
        ├── support_requests
        ├── contact_messages
        └── rate_limits
```

---

## 3. Table Reference

### 3.1 Core Identity

#### `profiles`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| user_id | uuid | No | — | Unique, references auth.users conceptually (no FK) |
| display_name | text | Yes | — | |
| first_name | text | Yes | — | |
| last_name | text | Yes | — | |
| username | text | Yes | — | Should have unique index |
| email | text | Yes | — | |
| email_verified | boolean | Yes | — | |
| phone | text | Yes | — | Unique indexed for auth lookups |
| avatar_url | text | Yes | — | Auto-generated initials SVG on registration |
| bio | text | Yes | — | |
| city | text | Yes | — | Currently hardcoded list, future: Google Places |
| page_classification | text | Yes | — | e.g. "DJ", "Promoter" — for professional profiles |
| instagram_handle | text | Yes | — | |
| is_verified | boolean | No | false | Manual verification flag |
| profile_tier | text | No | 'personal' | 'personal' or 'professional' |
| qr_code | text | No | — | Unique Digital ID for check-in (e.g. `PID-{uuid}`). Regenerable via `profile-qr-regenerate`. |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

**RLS**: Public read (all authenticated), owner write via edge function. `is_profile_public()` checks `profile_tier = 'professional'` for public profile visibility.

#### `organiser_profiles`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| owner_id | uuid | No | — | The user who created this organiser |
| display_name | text | No | — | |
| username | text | No | — | Unique |
| avatar_url | text | Yes | — | |
| bio | text | Yes | — | |
| city | text | Yes | — | |
| category | text | No | 'Promoter' | Promoter, Venue, DJ, Artist, etc. |
| instagram_handle | text | Yes | — | |
| opening_hours | jsonb | Yes | — | Only for Venue category |
| tags | jsonb | Yes | '[]' | Genre, crowd type, features |
| created_at/updated_at | timestamptz | No | now() | |

**RLS**: Public read, owner full access.

#### `organiser_members`
Team membership for organiser profiles. Roles: `editor`. Statuses: `pending`, `accepted`, `declined`.

**RLS**: Owner has full access. Accepted members can view team. Invited user can view/update own membership.

#### `organiser_followers`
Simple follow relationship (user → organiser). Includes `muted` boolean used to suppress organiser posts in the home feed.

#### `user_roles`
Admin role assignments. Enum: `super_admin`, `moderator`, `support`. **No client writes** — managed via DB only.

#### `privacy_settings` / `notification_settings`
Per-user 1:1 settings tables. User can insert/update/view own records.

#### `user_music_connections`
Music service integrations (Spotify, Apple Music). `service_id` + `connected` boolean.

---

### 3.2 Social

#### `connections`
Friend request graph. `requester_id` → `addressee_id`. Status: `pending`, `accepted`. `muted` boolean is used to suppress posts in the home feed.

**RLS**: Users can view/manage own connections (either side). Addressee can accept (UPDATE).

#### `blocked_users`
`blocker_id` → `blocked_id`. Feed queries filter blocked users in `feedService.ts` and `usePostsQuery.ts`.

#### `posts`
| Column | Type | Notes |
|--------|------|-------|
| author_id | uuid | Required |
| organiser_profile_id | uuid | Nullable — when set, post attributed to organiser |
| event_id | uuid | Nullable — auto-created post when event is created |
| content | text | Nullable (must have content OR image OR gif) |
| image_url | text | Uploaded to `post-images` bucket |
| gif_url | text | GIF API integration (pending) |

**Trigger**: `validate_post_content` ensures at least one of content/image/gif exists.
**RLS**: Public read, authenticated insert (own), author delete.

#### `post_likes`
Supports multiple reaction types via `reaction_type` column (default: 'heart'). 5 types: ❤️ heart, 🔥 fire, 👀 eyes, 🙏 pray, 🩷 mood.

#### `post_reposts` / `post_collaborators`
Standard junction tables with cascade-ready FKs.

---

### 3.3 Events

#### `events`
| Column | Type | Notes |
|--------|------|-------|
| host_id | uuid | The creating user (FK → profiles.user_id) |
| organiser_profile_id | uuid | Nullable (FK → organiser_profiles) |
| status | text | Default 'published'. **⚠️ Not filtered in queries** |
| ticket_price_cents | integer | Default 0 (free) |
| category | text | Default 'party' |
| guestlist_enabled | boolean | Default true |
| guestlist_deadline | timestamptz | Enforced in `rsvp_join` |
| guestlist_require_approval | boolean | Enforced; RSVP enters `pending` until approved |
| guestlist_max_capacity | integer | Separate from max_guests |
| show_tickets_remaining | boolean | |
| tickets_available_from | timestamptz | Null = open immediately |
| tickets_available_until | timestamptz | Null = close 1 min before event |
| publish_at | timestamptz | **⚠️ Not enforced — events visible immediately** |
| vip_tables_enabled | boolean | Enable VIP table reservations |
| sold_out_message | text | |
| tags | jsonb | Default '[]' |

**RLS**: Public events readable by all. Host can update/delete. Authenticated can insert (as host).

#### `rsvps`
| Column | Type | Notes |
|--------|------|-------|
| event_id | uuid | FK → events |
| user_id | uuid | FK → profiles.user_id |
| status | text | 'going', 'maybe', 'not_going', 'interested', 'pending' |
| guest_count | integer | Default 1, max 5 (server-clamped) |

**Writes**: Exclusively through `rsvp_join` / `rsvp_leave` RPCs. No direct client writes.
**⚠️ Missing**: Unique constraint on `(event_id, user_id)` — needed for upsert in webhook.

#### `waitlist`
Capacity overflow queue for free RSVPs.

| Column | Type | Notes |
|--------|------|-------|
| event_id | uuid | FK → events |
| user_id | uuid | User on waitlist |
| position | integer | 1-based position, recomputed after removals |
| notified_at | timestamptz | Set when promoted |

**Writes**: Enqueued by `rsvp_join` when capacity is full; promoted by `waitlist-promote` edge function (triggered after RSVP leave, order cancellations, and expiry cleanup).

#### `event_media`
Additional gallery media per event.

| Column | Type | Notes |
|--------|------|-------|
| event_id | uuid | FK → events |
| url | text | Public URL in `event-media` bucket |
| sort_order | integer | Gallery order |
| uploaded_by | uuid | Uploading user |

**Writes**: Inserted by `event-media-upload` edge function (signed upload + DB insert). Deletes via `event-media-manage`.

#### `event_messages`
Attendee chat messages. **Realtime enabled**.

**RLS**: SELECT/INSERT restricted to users with an RSVP or event host. No UPDATE/DELETE.

#### `ticket_tiers`
Per-event pricing tiers. `price_cents`, `available_quantity`, `sort_order`, `name`.

#### `vip_table_tiers`
VIP table offerings per event.

| Column | Type | Notes |
|--------|------|-------|
| event_id | uuid | FK → events |
| name | text | Tier name (e.g. Bronze Table) |
| min_spend_cents | integer | Minimum spend / table price |
| available_quantity | integer | Number of tables available |
| max_guests | integer | Max guests per table |
| included_items | jsonb | List of inclusions |
| is_active | boolean | Toggle availability |

**RLS**: Host/organiser owner/member manage. Public can view for public events when `vip_tables_enabled`.

#### `vip_table_reservations`
Paid reservations for VIP tables.

| Column | Type | Notes |
|--------|------|-------|
| event_id | uuid | FK → events |
| vip_table_tier_id | uuid | FK → vip_table_tiers |
| user_id | uuid | Reserving user |
| guest_count | integer | Guests included in table |
| status | text | reserved, confirmed, cancelled, expired |
| amount_cents | integer | Total charge (min spend + fee) |
| platform_fee_cents | integer | 7% service fee |
| stripe_payment_intent_id | text | Stripe PI |
| expires_at | timestamptz | 15‑minute reservation hold |

**Writes**: Via `vip-reserve` and `vip-payments-intent` edge functions. `stripe-webhook` confirms reservation and upserts RSVP.

#### `vip_refunds`
Refund records for VIP reservations.

| Column | Type | Notes |
|--------|------|-------|
| vip_reservation_id | uuid | FK → vip_table_reservations |
| amount_cents | integer | Refunded amount |
| status | text | pending, succeeded, failed |
| stripe_refund_id | text | Stripe refund reference |
| initiated_by | uuid | User who initiated refund |

**Writes**: Via `vip-cancel` edge function (refund flow).

#### VIP Availability RPC
`get_vip_table_tiers_public(event_id)` returns VIP tiers with `available_remaining` and `sold_out`, filtering to public events with `vip_tables_enabled` and excluding expired holds.

#### `orders`
15-minute reservation window. States: `reserved` → `confirmed` / `failed` / `expired`. Stores `stripe_payment_intent_id`, `stripe_account_id` (connected account).
Includes `referral_click_id` (nullable) for conversion attribution.

**⚠️ No cleanup cron**: Expired reserved orders are never cleaned up.

#### `event_link_clicks`
Share + click tracking. `action` in ('share', 'click'), optional `channel`, optional `session_id`.

#### `event_views`
Per-event views (deduped by `event_id + session_id + view_date`).

#### `event_link_conversions`
Confirmed ticket purchase attribution. Links `orders` to optional `event_link_clicks`.

#### `tickets`
Issued after payment confirmation (via webhook). Contains `qr_code` (unique), `status` ('valid', 'cancelled', 'transferred').

#### `discount_codes`
Per-event. Types: percentage, fixed. Can reveal hidden ticket tiers. Usage limits via `ticket_limit_type` + `ticket_limit_amount`.

#### `check_ins`
Event attendance verification. `method`: 'manual' or 'qr'. `checked_in_by` tracks who performed the check-in.

---

### 3.4 Messaging

#### `dm_threads` + `dm_messages`
1:1 messaging between a personal user and an organiser profile. Thread scoped by `(user_id, organiser_profile_id)`.

**RLS**: Both sides (user and organiser owner/members) can view and send.

#### `group_chats` + `group_chat_members` + `group_chat_messages`
Multi-user group chats. 3-member minimum enforced in UI. `member_count` denormalized on `group_chats`.

**RPC**: `get_user_group_chats(p_user_id)` fetches user's group chats with last message + member previews in a single optimised query.

---

### 3.5 Loyalty & Gamification

#### `user_points`
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | Unique |
| total_points | integer | Default 0 |
| current_rank | user_rank enum | Default 'bronze' |

Rank thresholds: 0=bronze, 1000=silver, 2000=gold, 3000=platinum, 4000=diamond.

#### `point_transactions`
Audit log of all point awards. Action types: add_friend (5), save_event (5), like_post (5), follow_organiser (10), share_event (10), rsvp_event (25), buy_ticket (50), create_event (50), app_review (50).

#### `user_vouchers`
$5 reward vouchers auto-issued on rank-up. 90-day expiry. Statuses: available, used.

#### `user_badges`
Achievement badges. Schema exists, **no badge awarding logic implemented** beyond rank-up vouchers.

---

### 3.6 Admin & Moderation

#### `reports`
User-submitted reports (post, user, event). Fields for admin assignment, resolution notes, status tracking. **No admin UI exists**.

#### `moderation_actions`
Immutable audit log. **No-write RLS policy** — nothing currently writes to this table.

#### `support_requests`
Help desk tickets with category, status, context metadata. Created via `support-request-create` edge function.

---

### 3.7 Infrastructure

#### `notifications`
In-app notifications with 20-day auto-expiry. `organiser_profile_id` for profile-scoped filtering. `purge_expired_notifications` runs daily via pg_cron.

#### `rate_limits`
DB-backed sliding window rate limiter. Used by all edge functions. Probabilistic cleanup (5% of requests).

#### `image_telemetry_events`
Sampled frontend image delivery telemetry captured via the public `image-telemetry` edge function.

| Column | Type | Notes |
|--------|------|-------|
| `asset_type` | text | `avatar`, `post`, `event-flyer`, `event-media`, `notification`, etc. |
| `bucket` | text | Supabase storage bucket when applicable |
| `preset` | text | Shared frontend image preset used for the render |
| `surface` | text | UI surface identifier such as feed, event detail, notification |
| `delivery_mode` | text | `transformed`, `raw-fallback`, `external`, `blob-preview` |
| `load_status` | text | `loaded` or `error` |
| `fallback_used` | boolean | Whether a non-primary candidate was needed |
| `cache_hint` | text | Best-effort browser hint: `cached`, `network`, `unknown` |
| `image_path` | text | Storage path without the host |
| `page_path` | text | App route where the event was emitted |

**View**: `image_telemetry_daily_summary` aggregates day, surface, preset, delivery mode, cache hint, and status.

---

## 4. Storage Buckets

| Bucket | Public | Used By | Upload Path Pattern |
|--------|--------|---------|---------------------|
| `avatars` | Yes | Personal + organiser avatars | `<user_id>/personal/<user_id>/...` or `<user_id>/organiser/<organiser_profile_id>/...` |
| `post-images` | Yes | Post image uploads | `<user_id>/posts/...` |
| `event-flyers` | Yes | Event cover images | `<user_id>/event-flyers/...` |
| `event-media` | Yes | Additional event media gallery | `<user_id>/events/<event_id>/gallery/...` |

**Current posture**: public buckets with transformed CDN delivery on user-facing renders, signed upload URLs for all first-party writes, and path-owner storage policies on mutable operations.

---

## 5. Database Functions

### Security Definer Functions (RLS Helpers)
| Function | Purpose |
|----------|---------|
| `has_role(user_id, role)` | Check admin role |
| `is_admin(user_id)` | Check any admin role |
| `is_organiser_owner(profile_id, user_id)` | Organiser ownership |
| `is_organiser_member(profile_id, user_id)` | Accepted team member |
| `is_group_chat_member(group_id, user_id)` | Chat membership |
| `is_profile_public(user_id)` | Checks `profiles.profile_tier = 'professional'` |

### Business Logic Functions
| Function | Purpose |
|----------|---------|
| `rsvp_join(event_id, status, guest_count)` | Atomic RSVP with capacity lock; enqueues waitlist when full |
| `rsvp_leave(event_id)` | RSVP removal |
| `award_points(action_type, description)` | Points + rank + voucher with row lock |

### Aggregation Functions
| Function | Purpose |
|----------|---------|
| `get_friend_count(user_id)` | Accepted connections count |
| `get_friends_and_following_count(user_id)` | **⚠️ Same as friend_count** |
| `get_mutual_friends(user_a, user_b)` | Mutual friend profiles |
| `get_organiser_follower_count(id)` | Follower count |
| `get_organiser_attendee_count(id)` | Unique attendee count |
| `get_organiser_past_event_count(id)` | Past event count |
| `get_personal_combined_event_count(user_id)` | Past attended count |
| `get_group_chat_member_profiles(group_id)` | Chat member profiles |
| `get_user_group_chats(p_user_id)` | User group chats with last message + member previews |

### Utility Functions
| Function | Purpose |
|----------|---------|
| `check_rate_limit(...)` | Sliding window rate limiter |
| `cleanup_old_rate_limits()` | Purge old rate limit records |
| `purge_expired_notifications()` | 20-day notification cleanup |
| `purge_orphaned_notifications()` | Remove notifications with dead links |

### Triggers
| Trigger | Table | Purpose |
|---------|-------|---------|
| `handle_new_user()` | auth.users (INSERT) | Auto-create profile row |
| `validate_post_content()` | posts (INSERT) | Ensure content/image/gif exists |
| `update_updated_at_column()` | Various | Auto-update timestamps |

---

## 6. Realtime Publications

Tables added to `supabase_realtime`:
- `posts` — Feed live updates
- `post_reposts` — Repost notifications
- `event_messages` — Event board live chat
- `notifications` — Badge count updates
- `user_points` — Loyalty score sync

---

## 7. Indexes (Current + Recommended)

### Existing
- `profiles.phone` — Unique index (auth lookup)
- `profiles.user_id` — Unique
- `rate_limits (endpoint, user_id, window_start)` — Partial unique (WHERE user_id IS NOT NULL)
- `rate_limits (endpoint, ip_address, window_start)` — Partial unique (WHERE ip_address IS NOT NULL)

### Recommended (Not Yet Created)
See `docs/PLATFORM_TODOS.md` (Optimisation section) for full list. High-priority:
- `notifications(user_id, created_at)` — Feed queries
- `notifications(user_id) WHERE read = false` — Unread count
- `rsvps(event_id, status)` — Capacity checks
- `posts(created_at DESC)` — Feed pagination
- `profiles.username` — Mention lookups
- `events(event_date)` — Date filtering

---

## 8. Known Schema Issues

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | `get_friends_and_following_count` misleading | 🟡 Medium | Identical to `get_friend_count`. Should include organiser follows. |
| 2 | Expired order cleanup depends on external scheduling | 🟡 Medium | `orders-expire-cleanup` exists, but reserved orders can linger if the cron job is not configured. |
| 3 | `publish_at` is query-driven, not a full status workflow | 🟡 Medium | Public listings filter by `publish_at`, but editing scheduled events still needs careful status handling. |
| 4 | No cascade deletes verified | 🟢 Low | Post likes/reposts/collaborators may orphan on post delete. |

---

## 9. Future Tables / Schema Changes

### Planned
| Table/Change | Purpose | Priority |
|-------------|---------|----------|
| Fix `get_friends_and_following_count()` | Include organiser follows in count | 🟡 Medium |
| Ensure `orders-expire-cleanup` cron is configured | Prevent inventory lockup | 🟡 Medium |
| Tighten scheduled publishing workflow | Align `publish_at` and `status` semantics | 🟡 Medium |
| Add `status` filter to event queries | Hide drafts/cancelled | 🟡 Medium |

### Potential Future Tables
| Table | Purpose | Notes |
|-------|---------|-------|
| `user_streaks` | Daily/weekly login and attendance streaks | Part of gamification roadmap |
| `challenges` / `user_challenges` | Weekly/seasonal challenge system | High engagement potential |
| `leaderboards` | City/friend/organiser leaderboards | Weekly reset, monthly archive |
| `venue_loyalty_cards` | Digital stamp cards for venue regulars | Requires venue partnership model |
| `event_ratings` | Post-event attendee ratings | "Community Pick" badge system |
| `referral_codes` / `referral_rewards` | Structured referral program | Currently basic via `referrals-track` |
| `table_bookings` | VIP table reservation system | Future revenue stream |
| `point_transactions_archive` | Archive old transactions | Data retention (12+ months) |

---

## 10. Migration History

All migrations are managed via Lovable Cloud and stored in `supabase/migrations/` (read-only). Key milestones:
- Initial schema: profiles, events, rsvps, connections
- Posts system with media support
- Organiser profiles and team management
- Ticketing and payments (Stripe Connect)
- Loyalty/gamification (points, ranks, vouchers)
- Notification system with auto-expiry
- Rate limiting infrastructure
- Multi-reaction system
- Event board (attendee chat) with realtime
- Check-in system
- Discount codes
- Refunds schema

---

*Last updated: 20 March 2026*
