# Database Optimisation Checklist

> Comprehensive review of database health, size management, and best practices across the platform.  
> ✅ = implemented, 🔲 = recommended, ⚠️ = high priority  
> Last updated: 2026-03-13

---

## 1. Data Retention & Auto-Cleanup

| # | Table | Recommendation | Status | Impact |
|---|-------|----------------|--------|--------|
| 1.1 | `notifications` | Auto-expire after 20 days via `expires_at` default + `purge_expired_notifications` cron (daily) | ✅ Done | Prevents unbounded growth |
| 1.2 | `notifications` | Purge orphaned notifications (dead links) via `purge_orphaned_notifications()` | ✅ Done | Removes stale references to deleted events/posts/users |
| 1.3 | `rate_limits` | Cleanup via `cleanup_old_rate_limits()` called probabilistically (5% of requests) | ✅ Done | Could accumulate during low-traffic periods; consider adding a daily cron as backup |
| 1.4 | `point_transactions` | No retention policy — grows indefinitely per user action | 🔲 Pending | Archive transactions older than 12 months to a `point_transactions_archive` table or add a summary row |
| 1.5 | `post_likes` | No cleanup — deleted posts leave orphaned likes (FK cascade should handle) | 🔲 Review | Verify `ON DELETE CASCADE` is set on `post_id` FK; if not, add it |
| 1.6 | `post_reposts` | Same as likes — verify cascade delete | 🔲 Review | Orphaned reposts inflate counts |
| 1.7 | `post_collaborators` | Same — verify cascade on post deletion | 🔲 Review | Low volume but good hygiene |
| 1.8 | `event_messages` | No TTL — old event chat messages persist forever | 🔲 Pending | Add 90-day expiry or archive after event ends + 30 days |
| 1.9 | `check_ins` | Historical data, rarely queried after event ends | 🔲 Pending | Consider partitioning by month or archiving after 6 months |
| 1.10 | `orders` | Expired reservations (`status = 'reserved'`, `expires_at < now()`) never cleaned up | ⚠️ High Priority | Phantom reservations may block inventory. Need cleanup cron. |

---

## 2. Indexing Strategy

| # | Table.Column(s) | Recommendation | Status | Impact |
|---|-----------------|----------------|--------|--------|
| 2.1 | `notifications(user_id, created_at)` | Composite index for feed queries (sorted by time, filtered by user) | 🔲 Pending | High — every notification page load hits this |
| 2.2 | `notifications(user_id, read)` | Partial index `WHERE read = false` for unread count badge | 🔲 Pending | High — called on every page via realtime subscription |
| 2.3 | `posts(created_at DESC)` | Index for feed pagination | 🔲 Pending | Medium — feed sorts by created_at |
| 2.4 | `posts(author_id, created_at DESC)` | Composite for profile feed tab | 🔲 Pending | Medium |
| 2.5 | `rsvps(event_id, status)` | Composite for guest count / capacity checks | 🔲 Pending | High — checked on every RSVP + event detail load |
| 2.6 | `rsvps(user_id, status)` | For tickets page (user's events) | 🔲 Pending | Medium |
| 2.7 | `connections(requester_id, status)` + `(addressee_id, status)` | Composite indexes for friend queries | 🔲 Pending | Medium — friend count and suggestions |
| 2.8 | `events(event_date)` | For upcoming/past event filtering | 🔲 Pending | Medium |
| 2.9 | `events(organiser_profile_id, event_date)` | Dashboard event listing | 🔲 Pending | Medium |
| 2.10 | `organiser_followers(organiser_profile_id)` | Follower count queries | 🔲 Pending | Low-Medium |
| 2.11 | `post_likes(post_id)` | Reaction count aggregation | 🔲 Pending | Medium — every feed post fetches this |
| 2.12 | `profiles(phone)` | Already has unique index | ✅ Done | Auth login speed |
| 2.13 | `profiles(username)` | For @mention and profile lookups | 🔲 Pending | Medium |
| 2.14 | `event_messages(event_id, created_at)` | Event board message ordering | 🔲 Pending | Medium — grows with active events |

---

## 3. Query Optimisation

| # | Area | Recommendation | Status | Impact |
|---|------|----------------|--------|--------|
| 3.1 | Feed post interactions | Currently N+1 — each post fires a separate `usePostInteractions` query. Batch into a single RPC that returns counts for multiple post IDs | ⚠️ High Priority | High — 10 posts = 40 queries (likes, reposts, my-like, my-repost × 10) |
| 3.2 | Notification unread count | Use a DB function `get_unread_notification_count(user_id)` instead of fetching all unread rows | 🔲 Pending | Medium — reduces data transfer |
| 3.3 | Profile queries | React Query `staleTime` set to 30s globally | ✅ Done | Reduces redundant refetches on navigation |
| 3.4 | Friend suggestions | Current query fetches all profiles then filters in JS. Move filtering to a DB function with `LIMIT` | 🔲 Pending | Medium — scales poorly as user count grows |
| 3.5 | Dashboard analytics | `dashboard-analytics` edge function runs multiple sequential queries. Use `LATERAL JOIN` or parallel `Promise.all` | 🔲 Pending | Medium |
| 3.6 | Event detail page | Fetches event, RSVP status, guest count, ticket status, and media in separate queries. Consolidate into single RPC | 🔲 Pending | Medium |
| 3.7 | Group chat loading | `Dashboard.tsx` calls non-existent `get_user_group_chats` RPC. Needs creation. | ⚠️ Blocking | Build error — must fix |

---

## 4. Row-Level Security Performance

| # | Area | Recommendation | Status | Impact |
|---|------|----------------|--------|--------|
| 4.1 | `events` SELECT policy | `is_public = true OR host_id = auth.uid()` — efficient, index-friendly | ✅ OK | — |
| 4.2 | `check_ins` policy | Uses 3 `EXISTS` subqueries with JOINs — could be slow on large tables | ⚠️ Review | Medium — consider caching permission in a materialised column |
| 4.3 | `event_media` policy | Similar multi-JOIN EXISTS pattern | 🔲 Review | Low — small table currently |
| 4.4 | `profiles` SELECT policy | Calls `is_profile_public()` function — currently hardcoded to `true` so no real overhead, but when fixed will add function-call cost per row | 🔲 Review | Medium at scale — consider inlining the check |
| 4.5 | `event_messages` policies | Two `EXISTS` subqueries (rsvps + events) on every SELECT/INSERT | 🔲 Review | Medium — will grow with active event boards |

---

## 5. Storage & Blob Management

| # | Bucket | Recommendation | Status | Impact |
|---|--------|----------------|--------|--------|
| 5.1 | `avatars` | No cleanup when user changes avatar — old files persist | 🔲 Pending | Low — small files but accumulates |
| 5.2 | `post-images` | No cleanup on post deletion — orphaned images | 🔲 Pending | Medium — images are larger |
| 5.3 | `event-flyers` | Same orphan issue on event deletion | 🔲 Pending | Medium |
| 5.4 | `event-media` | Same — add storage cleanup trigger or cron | 🔲 Pending | Medium |
| 5.5 | All buckets | No image compression/resizing on upload — store originals at full resolution | 🔲 Pending | High — add server-side resize via edge function (thumbnail + full) |
| 5.6 | All buckets | No CDN cache headers set — Supabase storage serves with default caching | 🔲 Pending | Medium — set `Cache-Control: public, max-age=31536000` for immutable assets |

---

## 6. Connection Pooling & Limits

| # | Area | Recommendation | Status | Impact |
|---|------|----------------|--------|--------|
| 6.1 | Edge functions | Each invocation creates a new Supabase client. For high-frequency functions, reuse client at module level | 🔲 Pending | Medium — reduces connection overhead |
| 6.2 | Realtime subscriptions | Multiple channels per page (notifications, feed, event messages, points). Consolidate into fewer channels with broader filters | 🔲 Pending | Medium — each channel = 1 WebSocket subscription |

---

## 7. Scheduled Maintenance

| # | Job | Recommendation | Status | Impact |
|---|-----|----------------|--------|--------|
| 7.1 | Purge expired notifications | Daily cron via `pg_cron` | ✅ Done | Core retention |
| 7.2 | Purge orphaned notifications | Can be run periodically via `purge_orphaned_notifications()` | ✅ Done | Cleans dead links |
| 7.3 | Purge expired orders | Orders with `status = 'reserved'` and `expires_at < now()` should be cancelled/deleted | ⚠️ High Priority | Prevents phantom reservations from blocking capacity |
| 7.4 | VACUUM ANALYZE | Postgres auto-vacuums but heavy-write tables (`notifications`, `rate_limits`, `post_likes`) benefit from more aggressive settings | 🔲 Pending | Medium — reduces table bloat after bulk deletes |
| 7.5 | Stale connections cleanup | Pending friend requests older than 30 days — auto-expire | 🔲 Pending | Low — good hygiene |
| 7.6 | Session/token cleanup | Supabase handles auth sessions, but verify `auth.sessions` isn't bloating | 🔲 Review | Low — managed by Supabase |

---

## 8. Monitoring & Alerts (Future)

| # | Metric | Recommendation | Status |
|---|--------|----------------|--------|
| 8.1 | Table row counts | Weekly log of row counts for top 10 tables to track growth trends | 🔲 Pending |
| 8.2 | Slow query log | Enable `pg_stat_statements` and review queries > 100ms | 🔲 Pending |
| 8.3 | Storage usage | Monitor total bucket sizes monthly | 🔲 Pending |
| 8.4 | Connection count | Alert if approaching Supabase plan connection limit | 🔲 Pending |
| 8.5 | Edge function cold starts | Track p95 latency for auth-critical functions (login, check-phone) | 🔲 Pending |

---

*Last updated: 13 March 2026*
