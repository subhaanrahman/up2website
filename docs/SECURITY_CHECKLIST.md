# Security Checklist

## Client-Write Locked Tables

These tables have RLS policies that **prevent direct client writes**. All mutations go through Edge Functions or secure DB RPCs:

| Table | Client INSERT | Client UPDATE | Client DELETE | Write Channel |
|-------|:---:|:---:|:---:|---|
| `point_transactions` | ❌ | ❌ | ❌ | `award_points` RPC (SECURITY DEFINER) |
| `user_points` | ✅ (own) | ❌ | ❌ | `award_points` RPC |
| `user_badges` | ❌ | ❌ | ❌ | `award_points` RPC (on level-up) |
| `user_vouchers` | ❌ | ✅ (own) | ❌ | `award_points` RPC (on level-up) |

## Tables With Client Writes (via Edge Functions)

All writes below are routed through Edge Functions even though RLS allows them. This ensures server-side validation:

| Table | Edge Function | Validates |
|-------|--------------|-----------|
| `events` | `events-create` | Auth, input sanitization |
| `rsvps` | `rsvp` → `rsvp_join`/`rsvp_leave` RPCs | Auth, capacity, access (public/invited/host) |
| `profiles` | `profile-update` | Auth, field whitelist |
| `privacy_settings` | `settings-upsert` | Auth, table whitelist |
| `notification_settings` | `settings-upsert` | Auth, table whitelist |

## Operations That MUST Go Through Edge Functions

- ✅ Award loyalty points (`loyalty-award-points`)
- ✅ Create events (`events-create`)
- ✅ RSVP join/leave (`rsvp` → atomic DB functions)
- ✅ Update profile (`profile-update`)
- ✅ Update settings (`settings-upsert`)
- ✅ Track referral shares (`referrals-track`)
- 🔲 Create order reservation (`orders-reserve` — stub)
- 🔲 Create payment intent (`payments-intent` — stub)

## RSVP Race Condition Protection

- `rsvp_join` uses `FOR UPDATE` lock on the event row
- UNIQUE constraint `(event_id, user_id)` prevents duplicate RSVPs at DB level
- Composite index `(event_id, status)` for fast capacity queries
- Function execution restricted to `authenticated` role only

## Authorization Helpers

`src/features/identity/services/authorization.ts` provides:
- `requireAuth(supabase)` — verifies JWT, returns user
- `requireRole(supabase, userId, role)` — checks `page_classification`
- `requireEventOwner(supabase, userId, eventId)` — checks `host_id`

## Remaining TODOs

- [ ] Enable leaked password protection in auth settings
- [ ] Move avatar file upload to Edge Function (currently client-side to storage)
- [ ] Implement `orders-reserve` and `payments-intent` Edge Functions
- [ ] Add rate limiting to Edge Functions
- [ ] Add input sanitization/validation library (e.g., Zod) to all Edge Functions
- [ ] Consider revoking direct INSERT RLS on `rsvps` table (currently allowed but unused — writes go through RPC)
- [ ] Add banned/blocked user checks to `rsvp_join` when moderation is implemented
