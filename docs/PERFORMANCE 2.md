# Database and API performance

> How we find slow queries, add indexes safely, and reduce PostgREST egress.  
> Companion: [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md), [PLATFORM_TODOS.md](PLATFORM_TODOS.md) (Database section).

---

## 1. Slow queries — `pg_stat_statements`

Supabase enables **`pg_stat_statements`** on managed Postgres. Use the **SQL Editor** (Dashboard) to find expensive work.

**Top by total time** (cumulative cost):

```sql
SELECT
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  rows,
  left(query, 120) AS query_preview
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 15;
```

**Top by mean latency** (worst single execution on average):

```sql
SELECT
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(total_exec_time::numeric, 2) AS total_ms,
  left(query, 120) AS query_preview
FROM pg_stat_statements
WHERE calls >= 20
  AND query NOT ILIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 15;
```

**Most frequent** (chattiness / N+1 candidates):

```sql
SELECT calls, round(total_exec_time::numeric, 2) AS total_ms, left(query, 120) AS query_preview
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 15;
```

After changing indexes or app code, optionally **`SELECT pg_stat_statements_reset();`** (dev/staging) so the next sample is clean.

---

## 2. Index Advisor and `EXPLAIN`

- Use Supabase **Index Advisor** (Dashboard → Advisors, or project docs) on statements that scan large tables (`events`, `posts`, `connections`, `notifications`).
- For a specific query: **`EXPLAIN (ANALYZE, BUFFERS)`** in SQL Editor to confirm index use vs sequential scans.

Prefer **partial** indexes when filters are stable (e.g. `WHERE status = 'published'`, `WHERE read = false`). Avoid duplicating indexes already covered by a composite unless `EXPLAIN` shows a regression.

---

## 3. Region and latency

Primary DB region is fixed per Supabase project. Users far from that region pay round-trip latency on **every** query. Fixing indexes and reducing round-trips helps; **moving region** requires a **new project** and migration — see [supabase/MIGRATION_AND_HOSTING.md](supabase/MIGRATION_AND_HOSTING.md) (*Future: moving to a new Supabase region*).

---

## 4. Egress (PostgREST)

Large **`select('*')`** responses dominate egress. Prefer explicit column lists on hot list paths (see `eventsRepository` list/search). Dashboard “API egress” spikes can be normal after schema sync or heavy browsing; correlate with `pg_stat_statements`, not the headline number alone.

---

## 5. Frontend: feed and Realtime

The home feed uses React Query infinite pagination. **Broad** Realtime subscriptions that invalidate the whole feed on every `posts` / `post_reposts` change can amplify refetches; the app uses **debounced** invalidation (see `usePaginatedFeed` in `src/hooks/useFeedQuery.ts`).

---

## 6. Migrations for indexes

Ship additive indexes via **`supabase/migrations/*.sql`** (`CREATE INDEX IF NOT EXISTS`, `CONCURRENTLY` not used in transactional migrations). Example batch: `20260324120000_performance_indexes.sql`.
