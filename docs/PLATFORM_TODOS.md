# Platform Todos

> **Canonical pending backlog for the repo.** `docs/PLATFORM_TODOS.md` is **pending-only**: open, partial, deferred, and future work lives here. Shipped behaviour and completed architecture belong in the canonical docs instead: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DATABASE_ARCHITECTURE.md`](DATABASE_ARCHITECTURE.md), [`Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md`](Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md), [`PAYMENT_FLOW.md`](PAYMENT_FLOW.md), [`PAYMENT_TICKETING_PROGRAM.md`](PAYMENT_TICKETING_PROGRAM.md), [`SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md), and [`TESTING_GUIDE.md`](TESTING_GUIDE.md).  
> Critical incidents and release blockers stay at the top of this file.  
> Last updated: 2026-03-25 (Disk IO incident runbook, backlog reorder, pending-only cleanup)

---

## Critical Now — Disk IO / DB / storage / query hygiene

Primary incident reference:

- [Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md](Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md)

Use the runbook above for the evidence pack, repo-grounded hypotheses, validation queries, and acceptance thresholds. This section tracks only the still-open work.

| Priority | Item | Status | Notes |
| --- | --- | --- | --- |
| P0 | Capture Supabase evidence for the alert window around **2026-03-25 16:20 Australia/Sydney** | ⏳ Pending | Save hourly and daily Disk IO budget, CPU, memory, swap, cache-hit indicators, connections, and top SQL snapshots for the incident window. |
| P0 | Run the SQL evidence pack and save outputs into the incident log | ⏳ Pending | Use the fixed queries in [SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md](Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md). |
| P0 | Add missing messaging indexes | ⏳ Pending | Add indexes for `dm_messages(thread_id, created_at desc)`, `group_chat_messages(group_chat_id, created_at desc)`, `dm_threads(user_id, updated_at desc)`, `dm_threads(organiser_profile_id, updated_at desc)`, and `group_chat_members(user_id, group_chat_id)`. |
| P1 | Replace unread polling + per-thread unread count loops with a server-side unread-count path | ⏳ Pending | Current path in `useUnreadMessages` is a strong IO candidate. |
| P1 | Paginate DM/group/event board history instead of refetching full threads | ⏳ Pending | Current messaging screens refetch whole histories on realtime inserts. |
| P1 | Narrow realtime subscriptions and invalidation scope | ⏳ Pending | Focus on notifications, messaging, and feed invalidation breadth. |
| P1 | Remove remaining hot-path `select("*")` usage and move hot reads toward repository/RPC patterns | ⏳ Pending | Notifications and messaging are the first targets. |
| P1 | Review `dashboard-analytics` fan-out reads and move toward aggregated/RPC-backed queries | ⏳ Pending | Treat organiser analytics as a likely expensive read path. |
| P1 | Move rate-limit cleanup off request traffic | ⏳ Pending | `check_rate_limit` still performs cleanup in-band today. |
| P1 | Audit whether `notifications-process`, event analytics tables, and image telemetry contribute meaningful write churn | ⏳ Pending | Keep image telemetry if the sample rate remains intentionally low. |
| P2 | Add row-growth snapshots and table-size monitoring for hot tables | ⏳ Pending | Focus on `rate_limits`, `notifications`, `dm_messages`, `group_chat_messages`, `orders`, `rsvps`, `event_views`, `event_link_clicks`, `image_telemetry_events`. |
| P2 | Frontend hosting target: move to **static build + CDN** instead of long-term Cloud Run static serving | ⏳ Pending | Target Cloud Storage or Firebase Hosting plus Cloud CDN. |
| P2 | Add build/release stamp and deploy parity checks | ⏳ Pending | Teammates need an easy way to confirm they are testing the same live build. |

---

## Critical Now — Payment and ticketing QA / release blockers

Technical flow reference:

- [PAYMENT_FLOW.md](PAYMENT_FLOW.md)
- [PAYMENT_TICKETING_PROGRAM.md](PAYMENT_TICKETING_PROGRAM.md)

### Pre-launch

This section stays pending-only. Completed Stripe env sign-off and shipped flow details live in [PAYMENT_TICKETING_PROGRAM.md](PAYMENT_TICKETING_PROGRAM.md) and [PAYMENT_FLOW.md](PAYMENT_FLOW.md).

| Item | Status | Notes |
| --- | --- | --- |
| Test end-to-end payment flow in Stripe sandbox | ⏳ Partial | Automated runs were recorded earlier; manual buyer and organiser sandbox QA still needs release sign-off in [PAYMENT_TICKETING_PROGRAM.md](PAYMENT_TICKETING_PROGRAM.md). |
| Confirm Supabase session and frontend env match the same deployed project as Edge Functions | ⏳ Pending | Avoid `401 Invalid JWT` and stale-project testing. |
| Configure CORS for the production domain | ⏳ Pending | Edge functions still use wildcard CORS. |
| Confirm `orders-expire-cleanup` is scheduled and observable in logs | ⏳ Pending | Scheduler exists in repo; confirm secrets and production execution path are actually active. |
| Verify `PAYMENTS_DISABLED` kill-switch behaviour in the current environment | ⏳ Optional | Useful operations drill before broader QA. |

### Testing

Tracked here instead of [TESTING_GUIDE.md](TESTING_GUIDE.md), which remains the commands and architecture guide.

| Item | Status | Notes |
| --- | --- | --- |
| E2E: seed hosted project for `dev-login` when needed | ⏳ When needed | Run `auth_users_seed.sql` and `data_export.sql` on the same project as `VITE_SUPABASE_URL`; set `SEED_USER_PASSWORD`. |
| Expand Playwright for create event, feed posts, full RSVP, and paid checkout | ⏳ Future | Current E2E coverage is smoke-level. |
| Visual / snapshot regression tests | Future | Not used yet. |
| Release regression pass across auth, core, storage, social, notifications, check-in, embed, and payments | ⏳ Pending | Run this before release after the current payment and performance work settles. |

### Manual UAT matrix

Browser pass against the project in `supabase/config.toml` (current Sydney project unless explicitly testing elsewhere). Seed accounts and troubleshooting live in [`supabase/AUTH_AND_SEEDING.md`](supabase/AUTH_AND_SEEDING.md) and [`TESTING_GUIDE.md`](TESTING_GUIDE.md).

| Area | Check |
| --- | --- |
| Auth | Phone OTP or `dev-login` seed user; sign out and sign in; session survives refresh |
| Core | Home `/`, search `/search`, event `/events/:id`, own `/profile`, other user `/user/:userId` |
| Organiser | Create `/create`, edit `/events/:id/edit`, manage `/events/:id/manage` |
| Tickets | `/events`, `/checkout`, `/checkout/success` with Stripe test configuration |
| VIP | `/vip-checkout`, `/vip-checkout/success` if enabled |
| Storage | Avatars, flyers, and post images load correctly |
| Social | Friends/followers, `/messages`, DM and group threads |
| Settings | `/settings` and key subpages including Digital ID if used |
| Notifications | `/notifications` list and unread state |
| Edge-heavy | Check-in `/events/:id/checkin`; embed `/embed/:id` if used |
| Payments | Buyer and organiser sandbox flows from [PAYMENT_TICKETING_PROGRAM.md](PAYMENT_TICKETING_PROGRAM.md) |

---

## API Integrations

| API | Purpose | Status | Notes |
| --- | --- | --- | --- |
| Google Places API | City autocomplete in Edit Profile | ⏳ Pending | Replace the hardcoded city list with a backend proxy and secret-managed API key. |
| Twilio Verify Email Channel | Email OTP verification | ⏳ Pending | Requires Twilio Verify email channel setup plus sender integration. |
| Push notifications (FCM/APNs) | Mobile push | Future | `notification_settings` already has toggles, but there is no push infrastructure. |
| Apple Developer Program + PassKit | Apple Wallet Digital ID | ⏳ Pending | Requires Pass Type ID, certificates, and `WALLET_APPLE_*` secrets. |
| Google Wallet API | Google Wallet Digital ID | ⏳ Pending | Requires issuer setup and a dedicated service-account JSON for `wallet-google-save`. |

---

## Backend / product backlog

Open product/backend items that are not already tracked in the critical sections above.

| Area | Open items |
| --- | --- |
| Check-in | Digital ID wallet completion still depends on Apple/Google wallet setup. |
| Event media | Optional tightening of RLS and path ownership beyond the current image-platform hardening pass. |
| Event board | Message delete flow and send-path rate limiting. |
| DMs | Organiser-initiated outbound messaging. |
| Group chat | Remaining notification and unread-count cleanup after the current performance work. |
| Analytics | Richer sales, revenue, and demographic reporting beyond current dashboards. |
| Waitlist | Additional position and promotion rules after core flow stabilizes. |
| Reminders | Stronger scheduling/worker path for `event_reminders`. |
| Guestlist approval | Continue polishing host approval and pending RSVP rules. |

---

## Database & storage hygiene (extended)

Urgent DB/query work is tracked in the top critical section. This section is for the longer-tail hygiene items that should follow once the incident is contained.

| Theme | Backlog |
| --- | --- |
| Retention | Archive or summarize `point_transactions` after roughly 12 months; consider TTL for old `event_messages`; archive `check_ins` after event + N months. |
| Integrity | Confirm `ON DELETE CASCADE` on `post_likes`, `post_reposts`, and `post_collaborators`. |
| Storage | Orphan cleanup for avatars, `post-images`, `event-flyers`, and `event-media`; evaluate optional resize/WebP pipeline. |
| Ops | Weekly row-count snapshot, dead-tuple review, and connection alerting for heavy tables. |

---

## Ticketing Flow — standard tickets (Stripe)

Core standard ticketing is implemented. Remaining **open** standard-ticket items are:

- manual buyer and organiser sandbox sign-off in [PAYMENT_TICKETING_PROGRAM.md](PAYMENT_TICKETING_PROGRAM.md)
- release regression after payment, auth, or environment changes
- production CORS restriction
- confirmed `orders-expire-cleanup` scheduling and observability

Deeper technical behaviour remains documented in [PAYMENT_FLOW.md](PAYMENT_FLOW.md), not repeated here.

---

## Product: Guestlist vs VIP tables

Keep these concepts separate when planning work:

| Concept | Meaning |
| --- | --- |
| **Guestlist** | Free-entry or non-card RSVP path with approvals, capacity, and waitlist rules. |
| **VIP tables** | Higher-AOV reservations with their own pricing, refund, reconciliation, and fee strategy. |

The open VIP backlog remains below.

---

## VIP tables / high-AOV (deferred epic)

- Handle `charge.refunded` for VIP reservations and sync `vip_refunds` / reservation state.
- Add reconciliation reporting for VIP PaymentIntents versus `vip_table_reservations`.
- Finalize fee strategy for high minimum-spend reservations.
- Finish UX polish, operations runbooks, and optional Stripe sandbox E2E.

---

## Optimisation

### Auth / Login

| Item | Impact |
| --- | --- |
| Merge `check-phone` and `login` for returning users | Medium |

### Frontend

| Item | Impact |
| --- | --- |
| Convert suggested profiles query to `useQuery` instead of raw `useEffect` | Low |
| Remove static event data imports from `Index.tsx` and `EventDetail.tsx` | Low |
| Add `loading="lazy"` to off-screen images | Medium |
| Add route-level code splitting with `React.lazy()` and `Suspense` | Medium |
| Batch feed post interaction queries into a single RPC path | High |

### Backend / Edge Functions

| Item | Impact |
| --- | --- |
| Edge function cold starts: review connection pooling or module-level client reuse | Medium |
| Defer avatar generation to a background task instead of blocking registration | Medium |
| Extract phone normalization into one shared utility | Low |

### Database

| Item | Impact |
| --- | --- |
| Organiser profile queries: use a single RPC or join instead of a waterfall | Low |

### Resource Efficiency

| Item | Impact |
| --- | --- |
| Unused dependencies audit | Low |
| Supabase Realtime audit — verify every subscription is still needed | Low |
| Dead code removal (`queue.ts`, `authorization.ts`, and related leftovers) | Low |

---

## Stripe Phase 3 (partial)

### Webhook updates

- Handle `charge.refunded` for standard ticket orders with refund and ticket sync.
- Handle `charge.dispute.created` and flag admin follow-up.
- Optionally track `payout.paid` and `payout.failed`.

### Audit and observability

- Add admin-facing order history.
- Add reconciliation query or report comparing Stripe PaymentIntents with local orders.

---

## Cleanup Pending

### MOM: Cloud Tasks first, Pub/Sub later

Phase 1 of Cloud Tasks is already documented in `docs/supabase/CLOUD_TASKS.md`. Remaining open work:

| Item |
| --- |
| Design queue boundaries and document job types clearly. |
| Replace remaining in-process execution in `_shared/queue.ts` with Cloud Tasks. |
| Expand worker coverage for retries, delayed jobs, cleanup, and follow-up workflows. |
| Keep Pub/Sub deferred until there is a concrete need beyond Cloud Tasks. |
| Document equivalent queue-first alternatives for non-GCP stacks if the hosting strategy changes. |

---

## Platform hardening (external checklist)

Shipped hardening items now live in canonical docs such as [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md), [TESTING_GUIDE.md](TESTING_GUIDE.md), and [ARCHITECTURE.md](ARCHITECTURE.md). Open follow-ons stay here.

| Item | Status | Notes |
| --- | --- | --- |
| Private bucket + signed download URLs | Future | Public media is still public by default; revisit if access control requirements tighten. |
| Virus / malware scanning | Future | Revisit if uploads expand beyond image-only content. |
| Internal DLQ for webhook and job side-effects | ⏳ Pending | Cloud Tasks migration is the likely home for this. |
| General-purpose `audit_log` | Future | Add when admin/compliance needs outgrow current domain-specific audit tables. |
| PostHog or equivalent product analytics | ⏳ Pending | Add when funnel work begins; not required for current reliability goals. |
| Seeded staging for E2E | ⏳ Optional | Useful once payment, messaging, and performance work stabilizes. |

---

## References

| Doc | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Routes, edge functions, risks, and platform overview |
| [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) | Tables, RLS, RPCs, and schema detail |
| [Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md](Plans/SUPABASE_DISK_IO_AND_PERFORMANCE_REMEDIATION_PLAN.md) | Disk IO incident and DB performance operating runbook |
| [PAYMENT_FLOW.md](PAYMENT_FLOW.md) | Stripe lifecycle, webhook behavior, idempotency |
| [PAYMENT_TICKETING_PROGRAM.md](PAYMENT_TICKETING_PROGRAM.md) | Manual QA program for buyer and organiser flows |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Unit/E2E commands, CI, Sentry, Playwright |
| [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) | Table access model and edge-only write boundaries |
| [DEV_CONTEXT.md](DEV_CONTEXT.md) | Repo patterns and coding context |
| [supabase/README.md](supabase/README.md) | Supabase docs hub |
