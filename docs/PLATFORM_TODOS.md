# Platform Todos

> Consolidated checklist of pending work across APIs, backend, Stripe, optimisation, and cleanup.  
> Last updated: 2026-03-19

---

## Pre-launch

| Item | Status | Notes |
|------|--------|-------|
| Replace Stripe publishable key | ⏳ Pending | Move `pk_test_PLACEHOLDER` in `src/lib/stripe.ts` to `VITE_STRIPE_PUBLISHABLE_KEY` env var |
| Verify `STRIPE_WEBHOOK_SECRET` | ⏳ Pending | Create webhook endpoint in Stripe dashboard, confirm signing secret matches |
| Test end-to-end payment flow | ⏳ Pending | Full test with Stripe test mode |
| Configure CORS for production domain | ⏳ Pending | Edge functions use `*` wildcard — restrict to production domain |
| Add unique constraint on `rsvps (event_id, user_id)` | ⏳ Pending | Needed for upsert in webhook |

---

## API Integrations

| API | Purpose | Status | Notes |
|-----|---------|--------|-------|
| Google Places API | City autocomplete in Edit Profile | ⏳ Pending | Currently using hardcoded city list (`src/data/cities.ts`). Need to set up Google Cloud project, enable Places API, create API key, add as backend secret `GOOGLE_PLACES_API_KEY`, and build a proxy edge function. |
| GIF API (GIPHY) | GIF picker in Post Composer | ⏳ Pending | Tenor API deprecated. GIPHY is the preferred alternative. Edge function `gif-search` and `GifPicker` component exist as placeholders. Need API key as backend secret. |
| Twilio Verify Email Channel | Email OTP verification | ⏳ Pending | Enable the email channel in Twilio Verify Service (Twilio Console → Verify → your service → Email Integration). Requires SendGrid integration or approved email sender. |
| Push Notifications (FCM/APNs) | Mobile push notifications | Future | `notification_settings` table has `push_notifications` toggle but no push infrastructure exists. |

---

## Backend

### Check-In System
- [ ] QR code generation for ticket holders (link to checkin-qr)

### Media Gallery
- [ ] Edge function or direct storage upload for event media
- [ ] RLS: host/organiser can upload, public can view

### Event Board (Attendee Chat)
- [ ] Message deletion by author or host
- [ ] Rate limiting on message sends

### Share & Ticket Links
- [ ] Track link clicks / conversions

### Direct Messaging (Organiser DMs)
- [ ] Organiser-initiated DMs (outbound)
- [ ] Realtime enabled on DM tables
- [ ] Notification integration for new DM messages
- [ ] Unread message counts per thread

### Group Chat Improvements
- [ ] Realtime on group chat messages
- [ ] Group chat notification integration

### Analytics
- [ ] Per-event view tracking
- [ ] Detailed sales & revenue dashboard
- [ ] Attendee demographics

### Waitlist
- [ ] Wire `rsvp_join` to enqueue to waitlist instead of raising exception at capacity
- [ ] Notification flow when spots open
- [ ] Waitlist position management

### Event Reminders
- [ ] Scheduled job to send configured reminders (24h before, 1h before, etc.)
- [ ] Use existing `event_reminders` table configuration

### Guestlist Approval
- [ ] Approval/rejection UI for hosts
- [ ] Enforce `guestlist_deadline` in RSVP flow
- [ ] Enforce `guestlist_require_approval` — hold RSVPs as pending until approved

### VIP Tables (Future)
- [ ] Design table booking schema
- [ ] Payment flow for table reservations

---

## Optimisation

### Auth / Login
| # | Item | Impact |
|---|------|--------|
| 1 | Merge `check-phone` + `login` into single call for returning users | Medium |

### Frontend
| # | Item | Impact |
|---|------|--------|
| 2 | Convert suggested profiles query to `useQuery` instead of raw `useEffect` | Low |
| 3 | Remove static event data import from `Index.tsx` and `EventDetail.tsx` | Low |
| 4 | Add `loading="lazy"` to off-screen images (event lists, suggested profiles, feed posts) | Medium |
| 5 | Add `React.lazy()` + `Suspense` for route-level code splitting | Medium |
| 6 | **N+1 post interactions** — batch feed post queries into single RPC (like count, repost count, my like, my repost) | High |

### Backend / Edge Functions
| # | Item | Impact |
|---|------|--------|
| 7 | Rate limit cleanup: consider pg_cron instead of 5% of requests | Low |
| 8 | Edge function cold starts: consider connection pooling / module-level client | Medium |
| 9 | Defer avatar generation to background task instead of blocking registration | Medium |
| 10 | Extract phone normalization to shared utility across functions | Low |

### Database
| # | Item | Impact |
|---|------|--------|
| 11 | Add unique index on `profiles.username` | Medium |
| 12 | Organiser profile queries: single RPC or join instead of waterfall | Low |
| 13 | **notifications(user_id, created_at)** — composite index | High |
| 14 | **notifications(user_id, read)** — partial index `WHERE read = false` | High |
| 15 | **posts(created_at DESC)** — feed pagination | Medium |
| 16 | **posts(author_id, created_at DESC)** — profile feed | Medium |
| 17 | **rsvps(event_id, status)** — guest count / capacity checks | High |
| 18 | **rsvps(user_id, status)** — tickets page | Medium |
| 19 | **connections** — composite indexes for friend queries | Medium |
| 20 | **events(event_date)** — upcoming/past filtering | Medium |
| 21 | **events(organiser_profile_id, event_date)** — dashboard | Medium |
| 22 | **organiser_followers(organiser_profile_id)** — follower count | Low–Medium |
| 23 | **post_likes(post_id)** — reaction count | Medium |
| 24 | **profiles(username)** — @mention, profile lookups | Medium |
| 25 | **event_messages(event_id, created_at)** — event board ordering | Medium |

### Resource Efficiency
| # | Item | Impact |
|---|------|--------|
| 26 | Unused dependencies audit | Low |
| 27 | Image optimisation (WebP, transforms) | Medium |
| 28 | Supabase Realtime audit — verify needed subscriptions | Low |
| 29 | Dead code removal (`queue.ts`, `authorization.ts`, etc.) | Low |

---

## Stripe Phase 3 (pending)

### Webhook Updates
- [ ] Handle `charge.refunded` — update order status to `refunded`, mark tickets as `cancelled`
- [ ] Handle `charge.dispute.created` — flag order, notify admin
- [ ] Handle `payout.paid` / `payout.failed` (optional) — organiser payout status tracking

### Audit & Observability
- [ ] Add admin-facing order history view
- [ ] Add reconciliation query: compare Stripe PaymentIntents with local orders

---

## Cleanup Pending

### MOM: Cloud Tasks first, Pub/Sub later

| # | Item |
|---|------|
| 1 | Design Cloud Tasks queue(s) and document job types |
| 2 | Implement Cloud Tasks adapter for current queue interface |
| 3 | Replace in-process execution in `_shared/queue.ts` with Cloud Tasks |
| 4 | Worker/edge function to receive Cloud Tasks and run handlers |
| 5 | Use for retries, delayed jobs, webhook follow-ups, cleanup |
| 6 | Defer Pub/Sub until concrete need (document "Cloud Tasks first") |

---

## Quick Wins (1–2 hours each)

1. **Replace Stripe publishable key** — 15 min
2. **Verify STRIPE_WEBHOOK_SECRET** — 15 min
3. **CORS for production** — 30 min
4. **DB: Expired orders cleanup** — ensure `orders-expire-cleanup` cron is set — 15 min

---

## References

- [PAYMENT_FLOW.md](PAYMENT_FLOW.md) — webhook details and order lifecycle
- [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) — security audit
- [GAMIFICATION_OPTIONS.md](GAMIFICATION_OPTIONS.md) — gamification roadmap and future enhancements
