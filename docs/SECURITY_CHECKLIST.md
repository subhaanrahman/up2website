# Security Checklist

> Last updated: 2026-03-13

## Client-Write Locked Tables

These tables have RLS policies that **prevent direct client writes**. All mutations go through Edge Functions or secure DB RPCs:

| Table | Client INSERT | Client UPDATE | Client DELETE | Write Channel |
|-------|:---:|:---:|:---:|---|
| `point_transactions` | ❌ | ❌ | ❌ | `award_points` RPC (SECURITY DEFINER) |
| `user_points` | ✅ (own) | ❌ | ❌ | `award_points` RPC |
| `user_badges` | ❌ | ❌ | ❌ | `award_points` RPC (on level-up) |
| `user_vouchers` | ❌ | ✅ (own) | ❌ | `award_points` RPC (on level-up) |
| `orders` | ❌ | ❌ | ❌ | `orders-reserve` / `payments-intent` Edge Functions |
| `tickets` | ❌ | ❌ | ❌ | `stripe-webhook` Edge Function (via queue) |
| `refunds` | ❌ | ❌ | ❌ | Future: `refunds-create` Edge Function |
| `rsvps` | ❌ | ❌ | ❌ | `rsvp_join` / `rsvp_leave` RPCs (SECURITY DEFINER) |
| `moderation_actions` | ❌ | ❌ | ❌ | No writes currently — reserved for admin Edge Functions |
| `user_roles` | ❌ | ❌ | ❌ | Manual DB only |
| `notifications` | ❌ | ✅ (own) | ✅ (own) | Insert via Edge Functions only |

## Tables With Client Writes (via Edge Functions)

All writes below are routed through Edge Functions even though RLS may allow them. This ensures server-side validation:

| Table | Edge Function | Validates |
|-------|--------------|-----------|
| `events` | `events-create`, `events-update` | Auth, input sanitization |
| `profiles` | `profile-update` | Auth, field whitelist |
| `privacy_settings` | `settings-upsert` | Auth, table whitelist |
| `notification_settings` | `settings-upsert` | Auth, table whitelist |
| `organiser_profiles` | `organiser-profile-create`, `organiser-profile-update` | Auth, avatar generation |

## Tables With Direct Client Writes (RLS-Protected)

| Table | Operations | RLS Guard |
|-------|-----------|-----------|
| `posts` | INSERT, DELETE | `auth.uid() = author_id` |
| `post_likes` | INSERT, UPDATE, DELETE | `auth.uid() = user_id` |
| `post_reposts` | INSERT, DELETE | `auth.uid() = user_id` |
| `post_collaborators` | INSERT, DELETE | Author check |
| `connections` | INSERT, UPDATE, DELETE | Requester/addressee check |
| `blocked_users` | ALL | `auth.uid() = blocker_id` |
| `saved_events` | ALL | `auth.uid() = user_id` |
| `group_chat_messages` | INSERT | Permissive authenticated |
| `group_chat_members` | INSERT, DELETE | Self or group member |
| `event_messages` | INSERT | Attendee/host check via EXISTS |
| `dm_threads` | INSERT | `auth.uid() = user_id` |
| `dm_messages` | INSERT | Thread participant check |
| `contact_messages` | INSERT | `auth.uid() = user_id` |

## Operations That MUST Go Through Edge Functions

- ✅ Award loyalty points (`loyalty-award-points`)
- ✅ Create events (`events-create`)
- ✅ RSVP join/leave (`rsvp` → atomic DB functions)
- ✅ Update profile (`profile-update`)
- ✅ Update settings (`settings-upsert`)
- ✅ Track referral shares (`referrals-track`)
- ✅ Reserve order tickets (`orders-reserve`) — Zod validation, capacity check, 15-min expiry
- ✅ Create payment intent (`payments-intent`) — Stripe integration, Zod validation
- ✅ Organiser profile CRUD (`organiser-profile-create`, `organiser-profile-update`)
- ✅ Avatar upload (`avatar-upload`) — file type/size validation
- ✅ Report creation (`report-create`) — validation
- ✅ Support request creation (`support-request-create`) — validation

## RSVP Race Condition Protection

- `rsvp_join` uses `FOR UPDATE` lock on the event row
- UNIQUE constraint `(event_id, user_id)` prevents duplicate RSVPs at DB level (⚠️ may not exist — verify)
- Composite index `(event_id, status)` for fast capacity queries (⚠️ recommended, not yet created)
- Function execution restricted to `authenticated` role only
- Guest count clamped between 1 and 5 server-side

## Authorization Helpers

`src/features/identity/services/authorization.ts` provides:
- `requireAuth(supabase)` — verifies JWT, returns user
- `requireRole(supabase, userId, role)` — checks `page_classification`
- `requireEventOwner(supabase, userId, eventId)` — checks `host_id`

**⚠️ Note**: This file lives in the frontend bundle but is designed for edge function use. Edge functions have their own inline auth checks and don't import this file.

## Rate Limiting

All edge functions use DB-backed `check_rate_limit` RPC:
- Sliding window algorithm
- Per-user and per-IP tracking
- Configurable max requests and window size
- Probabilistic cleanup (5% of requests)

## Remaining TODOs

- [ ] **Fix `is_profile_public()` function** — currently returns `true` unconditionally, bypassing all privacy controls
- [ ] Enable leaked password protection in auth settings
- [ ] Add banned/blocked user checks to `rsvp_join` when moderation is implemented
- [ ] Add blocked user filtering to feed queries (`feedService.ts`, `usePostsQuery.ts`)
- [ ] Restrict CORS to production domain (currently `*` wildcard)
- [ ] Add rate limiting to `event_messages` INSERT (event board spam prevention)
- [ ] Implement content moderation pipeline (report → review → action)
- [ ] Move Stripe publishable key to environment variable
- [x] ~~Move avatar file upload to Edge Function~~ — `avatar-upload` with type/size validation, rate limiting
- [x] ~~Implement `orders-reserve` and `payments-intent`~~ — Zod validation, rate limiting, Stripe integration
- [x] ~~Add rate limiting to Edge Functions~~ — DB-backed `check_rate_limit` RPC
- [x] ~~Add input sanitization (Zod) to all Edge Functions~~ — applied across all endpoints
- [x] ~~Revoke direct INSERT/UPDATE/DELETE RLS on `rsvps`~~ — writes go through RPCs only
- [x] ~~Fix duplicate rate_limit indexes~~ — dropped overlapping unique indexes
- [x] ~~Auto-generate initials avatars~~ — `register` and `organiser-profile-create` ensure `avatar_url` is never null

---

*Last updated: 13 March 2026*
