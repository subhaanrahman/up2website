# Supabase Disk IO and Performance Remediation Plan

> Version 1  
> Project: `fxcosnsbaaktblmnvycv`  
> Incident anchor: **2026-03-25 16:20 Australia/Sydney (AEDT, UTC+11)**  
> Canonical operating runbook for Supabase Disk IO and DB/query performance work.  
> Companion docs: [`../PLATFORM_TODOS.md`](../PLATFORM_TODOS.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md), [`../DATABASE_ARCHITECTURE.md`](../DATABASE_ARCHITECTURE.md)

## 1. Incident Summary

Supabase reported that the current Sydney project is depleting its Disk IO budget. Treat this as a production-performance incident, even if the load was only internal QA. The goal is to identify whether the warning is primarily caused by:

1. Database/query IO saturation
2. Low cache-hit / memory-swap pressure inside Supabase
3. Global frontend latency from the current Cloud Run static-serving setup
4. Stale deploy parity between testers and the currently live frontend build

This plan does **not** treat compute scaling as the primary fix, but the current evidence allows a temporary compute bump in parallel if the project remains unstable during QA.

Official references:

- [Supabase: High Disk I/O](https://supabase.com/docs/guides/troubleshooting/exhaust-disk-io)
- [Supabase: Metrics API](https://supabase.com/docs/guides/telemetry/metrics)

Live evidence already captured from **March 25, 2026, 10:08pm-11:08pm Australia/Sydney**:

- current compute tier is **Nano** with **shared CPU** and **0.5 GB memory**
- live memory sat around **411 MB**, which leaves very little headroom on this tier
- live CPU was moderate at roughly **18.79%**, but `IOWait` spiked repeatedly
- read-heavy IOPS bursts were visible without sustained all-day Disk IO exhaustion
- `PostgREST` remained the least healthy component while `database`, `auth`, and `storage` flickered between healthy and unhealthy

This pattern points more strongly to bursty read/IO pressure on a very small instance than to pure CPU saturation.

## 2. Repo-Grounded Working Hypotheses

The current codebase already contains several patterns that can plausibly amplify read IO or write churn even under low user counts:

- `src/pages/Index.tsx`
  - mounts the feed, nearby events, suggested friends, and the home notification badge
  - also mounts `BottomNav`, which previously pulled the unread-message hook into the home route on every signed-in session
- `src/hooks/useUnreadMessages.ts`
  - previously polled every 30 seconds
  - previously performed per-thread unread count loops against `group_chat_messages` and `dm_messages`
- `src/pages/MessageThread.tsx` and `src/pages/DmThread.tsx`
  - fetch full thread history
  - invalidate and refetch entire thread queries on every new insert
- `src/hooks/useNotificationsQuery.ts`
  - previously loaded the full list for the home badge path
  - still needs verification that the count-only path remains lightweight
- `src/hooks/useFeedQuery.ts`
  - subscribes broadly to `posts` and `post_reposts`
  - previously invalidated the whole feed query family on write bursts
- `supabase/functions/dashboard-analytics/index.ts`
  - performs multiple fan-out reads per dashboard load
- `supabase/functions/_shared/rate-limit.ts`
  - still runs cleanup inside request traffic through `check_rate_limit`
- Frontend runtime
  - current production frontend is a static Vite build served from Cloud Run via `npx serve`
  - there is no documented CDN / edge-cache layer, immutable asset strategy, or build stamp

The incident report must keep these as separate hypotheses, not collapse them into one root cause too early.

## 3. Evidence To Capture From Supabase

Capture evidence for the exact incident window first:

- **Date:** 2026-03-25
- **Primary window:** 16:00-17:00 Australia/Sydney
- **Anchor event:** alert observed around 16:20 Australia/Sydney

From Supabase Dashboard / Observability, save screenshots or exported notes for:

- daily Disk IO budget view
- hourly Disk IO budget view for the incident window
- component health flapping for `PostgREST`, `database`, `auth`, and `storage`
- CPU utilization
- memory usage
- swap usage or swap-related memory pressure if exposed
- cache-hit indicators
- active connection count
- top SQL by total time
- top SQL by mean time
- top SQL by call count

Also capture:

- what QA activity was happening during the window
- whether the tester was in Australia or the United States
- whether the tester was confirmed to be on the latest deployed frontend build
- which route or session state was open during any health flapping:
  - all tabs closed
  - signed-out home
  - signed-in personal home
  - signed-in organiser home
  - dashboard / manage-event

## 4. SQL Evidence Pack

Run these in Supabase SQL Editor and paste the outputs into the incident log.

### 4.1 Top SQL by total time

```sql
SELECT
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  rows,
  left(query, 160) AS query_preview
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 15;
```

### 4.2 Top SQL by mean latency

```sql
SELECT
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(total_exec_time::numeric, 2) AS total_ms,
  left(query, 160) AS query_preview
FROM pg_stat_statements
WHERE calls >= 20
  AND query NOT ILIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 15;
```

### 4.3 Top SQL by call count

```sql
SELECT
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  left(query, 160) AS query_preview
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 15;
```

### 4.4 Active connections

```sql
SELECT
  state,
  count(*) AS connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connections DESC;
```

### 4.5 Cache-hit check

```sql
SELECT
  datname,
  blks_hit,
  blks_read,
  round(
    100 * blks_hit::numeric / NULLIF(blks_hit + blks_read, 0),
    2
  ) AS cache_hit_pct
FROM pg_stat_database
WHERE datname = current_database();
```

Interpretation:

- a high cache-hit rate usually means repeated reads are staying in memory instead of hitting disk
- if cache-hit drops while swap or memory pressure rises, Disk IO can spike quickly even without a single obvious “worst query”

### 4.6 Hot table sizes and scan patterns

```sql
WITH targets(relname) AS (
  VALUES
    ('rate_limits'),
    ('notifications'),
    ('dm_messages'),
    ('group_chat_messages'),
    ('orders'),
    ('rsvps'),
    ('event_views'),
    ('event_link_clicks'),
    ('image_telemetry_events')
)
SELECT
  t.relname,
  COALESCE(s.n_live_tup, 0) AS est_live_rows,
  pg_size_pretty(pg_total_relation_size(format('public.%I', t.relname)::regclass)) AS total_size,
  COALESCE(s.seq_scan, 0) AS seq_scan,
  COALESCE(s.idx_scan, 0) AS idx_scan
FROM targets t
LEFT JOIN pg_stat_user_tables s
  ON s.relname = t.relname
ORDER BY pg_total_relation_size(format('public.%I', t.relname)::regclass) DESC;
```

### 4.7 Dead tuples and autovacuum lag

```sql
SELECT
  relname,
  n_live_tup,
  n_dead_tup,
  round(
    100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0),
    2
  ) AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### 4.8 Sequential scan hotspots

```sql
SELECT
  relname,
  seq_scan,
  idx_scan,
  n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC, n_live_tup DESC
LIMIT 20;
```

### 4.9 Query-plan targets for manual `EXPLAIN (ANALYZE, BUFFERS)`

Prioritize plans that represent the current hot app paths:

- unread counts from `useUnreadMessages`
- notifications list reads from `useNotifications`
- thread history reads from `messagingRepository`
- organiser analytics paths behind `dashboard-analytics`
- feed paths and post interaction lookups referenced by `usePaginatedFeed` and feed services

## 5. How To Read The Results

Use these rules before deciding on remediation:

- If Supabase metrics are calm but overseas users report slowness, suspect region distance and the current frontend hosting path before blaming Disk IO.
- If Supabase shows Disk IO depletion, cache-hit degradation, swap pressure, or heavy top-query churn during the same window, treat DB/query load as the primary path.
- If CPU is only moderate but `IOWait` is repeatedly high, treat disk wait pressure as the leading signal even before CPU looks “red.”
- If one tester is slow and another is not, verify build parity before drawing conclusions. The platform needs a visible build/release identity so stale deploys are obvious.
- Do not reset `pg_stat_statements` until the evidence pack has been captured.

## 6. Prioritized Remediation Phases

### Phase 0 — Evidence capture and incident framing

- Capture the Supabase console evidence for the incident window before resetting anything.
- Capture the later **March 25, 2026, 10:08pm-11:08pm Australia/Sydney** live metrics window as a second evidence pack because that is where the `IOWait` spikes and component-health flapping were observed.
- Record tester region, current QA actions, and whether the live build was current.
- Run the reproduction order explicitly:
  - all tabs closed
  - signed-out home
  - signed-in personal home
  - signed-in organiser home
  - dashboard / manage-event
- Treat **a single signed-in organiser tab on `/`** as the key stability check for this incident class.
- Do **not** assume the problem is fixed by the image-caching changes made the previous night; verify deploy parity first.

### Phase 1 — Database and query load reduction

- Add the missing messaging indexes:
  - `dm_messages(thread_id, created_at desc)`
  - `group_chat_messages(group_chat_id, created_at desc)`
  - `dm_threads(user_id, updated_at desc)`
  - `dm_threads(organiser_profile_id, updated_at desc)`
  - `group_chat_members(user_id, group_chat_id)`
- Prioritize the home route first:
  - replace nav unread polling plus per-thread count loops with a server-side unread-count path
  - keep per-chat unread detail off the global nav and on the screens that actually need it
  - keep the home bell badge on a count-only path instead of loading the full notification list
  - stop broad home-feed realtime invalidation from immediately refetching the full feed
  - defer suggested-friends loading until after the initial feed render has settled
- Paginate DM, group chat, and event board message history instead of reloading full history.
- Narrow remaining realtime subscriptions and query invalidation so only the affected thread, user scope, or feed slice refreshes.
- Remove remaining `select("*")` on hot notification and messaging paths where explicit columns or RPCs are enough.
- Review `dashboard-analytics` and move repeated fan-out reads toward pre-aggregated/RPC-backed paths after the home-route baseline is stable.
- Move rate-limit cleanup off request traffic and onto a scheduled cleanup path.
- Check whether `notifications-process`, event analytics tracking tables, and image telemetry are causing meaningful write churn. Keep image telemetry if the sample rate remains intentionally low.

### Phase 2 — Frontend delivery architecture

- Treat the current Cloud Run static-serving path as transitional.
- Target architecture:
  - static Vite build
  - Cloud Storage or Firebase Hosting
  - Cloud CDN in front
  - immutable cache headers for hashed assets
  - short-cache or no-cache HTML entry document
  - compression and global edge delivery
- Keep Cloud Run only where dynamic runtime is genuinely required.
- Add deployment parity controls:
  - release/build stamp in the app
  - commit SHA and build time
  - documented deploy source of truth
  - simple “what version am I on?” verification for testers

### Phase 3 — Observability and ongoing operating practice

- Use Supabase Dashboard health views and Metrics API for ongoing alerting.
- Add or document alerts for:
  - Disk IO budget depletion
  - component health flapping for `PostgREST`, `database`, `auth`, and `storage`
  - sustained cache-hit degradation
  - sustained memory / swap pressure
  - query latency and call-count outliers
  - connection spikes
- Keep this runbook as the single operating reference for this incident class.

## 7. Acceptance Thresholds

Treat the remediation program as complete only when all of the following are true:

- a single signed-in organiser tab on `/` stays healthy for a 30-minute idle window
- `PostgREST` no longer flaps unhealthy during normal internal QA
- no recurring Disk IO warning during internal QA across multiple consecutive QA days
- the top offending query families are identified and reduced, not merely observed
- unread, messaging, notification, and feed paths no longer cause broad avoidable refetch loops
- a before/after evidence pack exists for Supabase metrics and SQL evidence
- the frontend has a visible build/release stamp so stale deploy parity is easy to detect
- the static frontend delivery path is either upgraded to static + CDN or explicitly scheduled as the next infrastructure milestone with an owner and target sequence

## 8. Validation After Changes

After any performance change:

1. Re-run the `pg_stat_statements` queries.
2. Re-run the cache-hit, active-connection, hot-table, dead-tuple, and sequential-scan queries.
3. Compare before/after for:
   - top call-count statements
   - mean latency on hot paths
   - sequential scan patterns
   - dead tuple growth
4. Re-check Supabase Dashboard for the same QA workload.
5. Confirm the tester is on the expected deployed build.

Performance work is not complete until the same evidence pack shows the problem got smaller, not merely different.

## 9. Rollback Rules

- If a query-path optimization causes messaging, notifications, or payment regressions, revert that path-specific change first and keep the additive indexes, evidence capture, and documentation improvements.
- If a static + CDN cutover causes auth, payment, or redirect-origin issues, keep the current Cloud Run path available until parity is verified end-to-end.
- If Disk IO pressure becomes operationally unsafe before the root cause work lands, temporarily upgrade compute above `Nano` in parallel with the code fixes. Record it as a safety valve with before/after evidence, not as the primary remediation.
