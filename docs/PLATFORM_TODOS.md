# Platform Todos

> Consolidated checklist of pending work across APIs, backend, Stripe, optimisation, and cleanup.  
> Shipped items (e.g. standard ticket `charge.refunded`, organiser refund ledger via `orders-list`, buyer self-service refunds) are documented in `docs/PAYMENT_FLOW.md` and `docs/ARCHITECTURE.md` so this file stays short.  
> Last updated: 2026-03-21

---

## Testing

Tracked here instead of [`TESTING_GUIDE.md`](TESTING_GUIDE.md) (that doc is **architecture + commands** only).

| Item | Status | Notes |
|------|--------|--------|
| `VITE_SENTRY_DSN` in GitHub Actions secrets | ⏳ Optional | Enables Sentry in CI-built bundle; local uses `.env.local`. See [TESTING_GUIDE.md](TESTING_GUIDE.md#3-sentry-browser). |
| E2E: seed data on hosted project for `dev-login` | ⏳ When needed | Run `auth_users_seed.sql` + `data_export.sql` on same project as `VITE_SUPABASE_URL`; set `SEED_USER_PASSWORD` Edge secret. |
| Expand Playwright: create event, feed posts, full RSVP, paid checkout | ⏳ Future | Current E2E is smoke-level; see specs in `tests/e2e/`. |
| Visual / snapshot regression tests | Future | Not used. |

### Manual UAT matrix (post–region migration)

Browser pass against the project in `supabase/config.toml` (e.g. Sydney). Seed: [`supabase/AUTH_AND_SEEDING.md`](supabase/AUTH_AND_SEEDING.md) (`seedplaceholder1` for seeded accounts). After switching Supabase projects, sign out and sign in ([`TESTING_GUIDE.md` — Invalid JWT](TESTING_GUIDE.md#5-end-to-end-playwright)).

| Area | Check |
|------|--------|
| Auth | Phone OTP (if Twilio live) or dev-login seed user |
| Auth | Sign out → sign in; session survives refresh |
| Core | Home `/`, search `/search`, event `/events/:id` |
| Core | Own `/profile`; other user `/user/:userId` |
| Organiser | Create `/create`; edit `/events/:id/edit`; manage `/events/:id/manage` |
| Tickets | `/events`; checkout `/checkout` → `/checkout/success` if Stripe test configured |
| VIP | `/vip-checkout` → `/vip-checkout/success` if enabled |
| Storage | Avatars / event images load |
| Social | `/profile/friends`, `/profile/followers`; `/messages` and threads |
| Settings | `/settings` and key subpages (incl. `/settings/digital-id` if used) |
| Notifications | `/notifications` |
| Edge-heavy | Check-in `/events/:id/checkin`; embed `/embed/:id` if used |
| Payments (optional) | Stripe test checkout per [PAYMENT_FLOW.md](PAYMENT_FLOW.md) sandbox checklist |

---

## Pre-launch

| Item | Status | Notes |
|------|--------|-------|
| Stripe publishable key in env | ⏳ Pending | Set `VITE_STRIPE_PUBLISHABLE_KEY` (see `src/lib/stripe.ts`); must match Stripe Dashboard **test vs live** mode for each environment. |
| Verify `STRIPE_WEBHOOK_SECRET` | ⏳ Pending | Stripe → Webhooks → endpoint `{SUPABASE_URL}/functions/v1/stripe-webhook`; signing secret must match Edge secret. See [PAYMENT_FLOW.md](PAYMENT_FLOW.md). |
| Test end-to-end payment flow | ⏳ Partial | **(A)** Automated **recorded 2026-03-20:** `npm run test` ✅, `npm run build` ✅, `npm run test:e2e` ✅ (14 passed, 2 skipped; no real card). **(B)** Manual sandbox: [PAYMENT_FLOW.md — Manual QA playbook](PAYMENT_FLOW.md#manual-qa-playbook-sandbox). Mark **Done** for (B) when run and noted in release. |
| Run unit + E2E test suites | ✅ Done (2026-03-20) | Same env prerequisites as [TESTING_GUIDE.md](TESTING_GUIDE.md). Latest recorded run: unit + build + Playwright (14 passed, 2 skipped). Re-run before releases if env or specs change. |
| Configure CORS for production domain | ⏳ Pending | Edge functions use `*` wildcard — restrict to production domain. **Note:** CORS does **not** fix `401 Invalid JWT` (that is auth/env/session). |
| Add unique constraint on `rsvps (event_id, user_id)` | ✅ Done | `20260317140000_rsvps_event_user_unique.sql` |

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

Completed backend items are summarized in `docs/ARCHITECTURE.md` and `docs/DATABASE_ARCHITECTURE.md` to keep this list focused on pending work.

---

## Ticketing Flow — standard tickets (Stripe)

**Status: feature-complete for app flows** (reserve → pay → webhook → tickets; Connect onboarding; 7% platform fee on top; refund policy + self-service + organiser ledger). Details: [PAYMENT_FLOW.md](PAYMENT_FLOW.md), [ARCHITECTURE.md](ARCHITECTURE.md).

- [x] Checkout, webhooks, organiser Connect, refunds (organiser + self-service), Manage Event orders/refunds via `orders-list`

---

## Product: Guestlist vs VIP tables

| Concept | Meaning in product | Implementation notes |
|--------|---------------------|----------------------|
| **Guestlist** | People on the **guest list** / RSVP path — **free entry** or non–card gate (approval, capacity, members-only visibility). Not “VIP minimum spend.” | Guestlist panels, `rsvp` / `rsvp-approve`, waitlist; distinct from paid `orders`. |
| **VIP tables** | **High-AOV** table bookings (minimum spend, larger payment totals). Separate commercial track from standard tickets. | Backend **partially** shipped (tiers, `vip-reserve`, `vip-payments-intent`, `vip-cancel`, Manage Event, analytics). Treat as **finish later** epic — see below. |

---

## VIP tables / high-AOV (deferred epic)

Finish as a **separate** initiative from standard ticketing (lower platform fee vs standard **7%** is a product decision once AOV/pricing is finalised).

- [ ] Stripe: `charge.refunded` for VIP reservations — sync `vip_refunds` / reservation state (`stripe-webhook`)
- [ ] Reconciliation report: VIP PaymentIntents vs `vip_table_reservations`
- [ ] Fee strategy: e.g. lower **application_fee** % than standard tickets for high minimum-spend tables (today VIP uses same **7%** on top in `vip-reserve` — change when product locks)
- [ ] UX polish, ops runbooks, optional E2E with Stripe test mode

**Still useful today (partial ship):**

- [x] VIP tier availability in Event Detail (sold-out per tier)
- [x] VIP reservations list in Manage Event
- [x] VIP cancellation/refund flow (host + attendee) via `vip-cancel`
- [x] VIP analytics in organiser dashboard

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
Shipped indexes are in migrations (latest batch `20260324120000_performance_indexes.sql`). Use [PERFORMANCE.md](PERFORMANCE.md) (`pg_stat_statements`) to validate in production.

| # | Item | Impact | Status |
|---|------|--------|--------|
| 11 | Unique `profiles.username` | Medium | ✅ Done (`UNIQUE` constraint migration) |
| 12 | Organiser profile queries: single RPC or join instead of waterfall | Low | ⏳ Open |
| 13 | **notifications(user_id, created_at)** | High | ✅ Done (`idx_notifications_user_id`) |
| 14 | **notifications** partial unread `(user_id, created_at) WHERE read = false` | High | ✅ Done (`idx_notifications_user_unread_created`) |
| 15 | **posts(created_at DESC)** — feed pagination | Medium | ✅ Done (`idx_posts_created`) |
| 16 | **posts(author_id, created_at DESC)** — profile feed | Medium | ✅ Done (`idx_posts_author_created_at`) |
| 17 | **rsvps(event_id, status)** | High | ✅ Done (`idx_rsvps_event_status`) |
| 18 | **rsvps(user_id, status)** — tickets / my RSVPs | Medium | ✅ Done (`idx_rsvps_user_status`) |
| 19 | **connections** — `(requester_id, status)`, `(addressee_id, status, created_at)` | Medium | ✅ Done |
| 20 | **events(status, event_date)** — list / search | Medium | ✅ Done (`idx_events_status_event_date`) |
| 21 | **events(organiser_profile_id, event_date)** — organiser dashboard | Medium | ✅ Done (partial index) |
| 22 | **organiser_followers(organiser_profile_id)** | Low–Medium | ✅ Done (`idx_organiser_followers_organiser_id`) |
| 23 | **post_likes(post_id)** | Medium | ✅ Done (`idx_post_likes_post`) |
| 24 | **profiles(username)** — lookups | Medium | ✅ Covered by unique username |
| 25 | **event_messages(event_id, created_at)** | Medium | ✅ Done (`idx_event_messages_event_created`) |

### Resource Efficiency
| # | Item | Impact |
|---|------|--------|
| 26 | Unused dependencies audit | Low |
| 27 | Image optimisation (WebP, transforms) | Medium |
| 28 | Supabase Realtime audit — verify needed subscriptions | Low |
| 29 | Dead code removal (`queue.ts`, `authorization.ts`, etc.) | Low |

---

## Stripe Phase 3 (partial)

### Webhook Updates
- [x] Handle `charge.refunded` (standard ticket orders) — `stripe-webhook` updates order to `refunded`, cancels tickets, upserts `refunds` row (see `docs/PAYMENT_FLOW.md`)
- [ ] Handle `charge.refunded` for **VIP** reservations — sync `vip_refunds` / reservation state (see [VIP tables / high-AOV (deferred epic)](#vip-tables--high-aov-deferred-epic))
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
| 7 | Alternatives to Cloud Tasks on non-GCP stacks: **Upstash QStash**, **Cloudflare Queues**, or **Inngest** — same idea: HTTP worker + retries + persistence |

**Status update:** Phase 1 implemented (webhook follow-ups only). See `docs/supabase/CLOUD_TASKS.md` for setup and `supabase/functions/queue-worker` for the worker.

---

## Platform hardening (external checklist)

Cross-cutting items from common “Lovable / early SaaS” advice, mapped to this repo. Use this section to retire duplicate notes elsewhere.

### Security / files

| Item | Status | Notes |
|------|--------|--------|
| Presigned uploads for all user content | ⏳ Partial | `event-media-upload` uses signed upload URLs. `post-images` (posts, flyer in create flow) still use client `storage.upload`; optional alignment later. |
| Private bucket + signed **download** URLs | Future | Public `getPublicUrl` is not time-limited; consider for sensitive media. |
| Virus / malware scanning | Future | Defer while uploads are image-only with MIME + size checks; revisit for arbitrary files. |

### Payments ops

| Item | Status | Notes |
|------|--------|--------|
| Global payments kill switch | ✅ Done | Edge secret `PAYMENTS_DISABLED` (`1` / `true` / `yes`) — `orders-reserve`, `payments-intent`, `vip-reserve`, `vip-payments-intent` return 503. |
| Stripe webhook signatures | ✅ Done | `stripe-webhook` verifies with `STRIPE_WEBHOOK_SECRET`. |
| Stripe retries | ✅ N/A (provider) | Stripe retries on non-2xx; we return 2xx after successful handling. |
| Internal DLQ for webhook side-effects | ⏳ Pending | In-process `enqueue()` today; see Cloud Tasks rows above. |

### Audit

| Item | Status | Notes |
|------|--------|--------|
| Domain audit today | ✅ Partial | `moderation_actions` (admin), `payment_events` (Stripe + idempotency). |
| General-purpose `audit_log` | Future | `(actor_id, action, entity_type, entity_id, metadata, request_id)` — add when admin/compliance needs grow. |

### Observability

| Item | Status | Notes |
|------|--------|--------|
| Sentry (errors) | ✅ Done | `@sentry/react` init when `VITE_SENTRY_DSN` is set; `ErrorBoundary` + `captureApiError`. Set DSN in `.env.local` locally; optional GitHub secret for CI builds — [TESTING_GUIDE.md](TESTING_GUIDE.md#3-sentry-browser). |
| PostHog (funnels / product analytics) | ⏳ Pending | Not integrated; add when funnel work starts. |

### CI / E2E

| Item | Status | Notes |
|------|--------|--------|
| Playwright on PRs | ✅ Done | `.github/workflows/ci.yml` — `e2e` job runs `npx playwright install --with-deps` + `npm run test:e2e` when secrets are configured. |
| Required GitHub Actions secrets | — | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (same as local `.env`; powers the Vite dev server during E2E). Optional: `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN`. If URL/key are missing, the job skips E2E and passes. See [TESTING_GUIDE.md](TESTING_GUIDE.md). |
| Seeded staging for E2E | ⏳ Optional | Host seed migrations: `20260325120000_seed_local_hosts.sql`, `20260325130000_seed_sydney_events.sql` (applied via `supabase db push` on target projects). `npm run seed:sydney` if present; not wired to CI. |

Backlog for broader QA and coverage: [**Testing**](#testing) (manual UAT matrix, Playwright expansion, snapshots).

---

## Quick Wins (1–2 hours each)

1. **Set `VITE_STRIPE_PUBLISHABLE_KEY`** — 15 min
2. **Verify STRIPE_WEBHOOK_SECRET** — 15 min
3. **CORS for production** — 30 min
4. **DB: Expired orders cleanup** — ensure `orders-expire-cleanup` cron is set — 15 min

---

## References

- [PAYMENT_FLOW.md](PAYMENT_FLOW.md) — webhook details and order lifecycle
- [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) — security audit
- [GAMIFICATION_OPTIONS.md](GAMIFICATION_OPTIONS.md) — gamification roadmap and future enhancements
