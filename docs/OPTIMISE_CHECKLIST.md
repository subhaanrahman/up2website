# Platform Optimisation Checklist

> Living document — prioritised by impact. ✅ = done, 🔲 = pending, 🔜 = next up  
> Last updated: 2026-03-13

---

## Auth / Login Performance

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 1 | **Fix `rate_limits` unique indexes** — ON CONFLICT was failing on every auth call due to missing partial unique indexes | ✅ Done | Medium | Added partial unique indexes + updated `check_rate_limit` function with matching WHERE clauses |
| 2 | **Replace magic-link session creation with `signInWithPassword`** — login was chaining 5 sequential calls. Now uses phone-based `signInWithPassword` (single call) | ✅ Done | High | Eliminates 2 network round-trips. Lazy password migration on first login for existing users |
| 3 | **Global React Query `staleTime: 30s`** — prevents redundant refetches on back/forward navigation | ✅ Done | Medium | Set in `App.tsx` QueryClient config with `refetchOnWindowFocus: false` |
| 4 | **Auth dedup guard** — `onAuthStateChange` and `getSession` no longer double-fire on cold boot | ✅ Done | Low | `authStateReceived` ref in AuthContext prevents duplicate state updates |
| 5 | **Merge `check-phone` + `login` into single call for returning users** — PhoneStep calls `checkPhone`, then PasswordStep calls `login` which re-does the phone lookup. Could skip check-phone entirely when user submits a password | 🔲 Pending | Medium | Front-end UX change — needs input on flow design |

---

## Frontend Performance

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 6 | **Suggested profiles query runs outside React Query** — `Index.tsx` uses a raw `useEffect` + `useState` to fetch suggested profiles instead of `useQuery`, bypassing cache and deduplication | 🔲 Pending | Low | Convert to a `useSuggestedProfiles` hook with `useQuery` |
| 7 | **Static event data import** — `Index.tsx` and `EventDetail.tsx` import `events` from `@/data/events` (hardcoded mock data) alongside real DB events. Creates confusion and unused bundle weight | 🔲 Pending | Low | Remove mock data imports once all pages use real DB queries |
| 8 | **Image lazy loading** — Event flyers and avatar images load eagerly. Add `loading="lazy"` to off-screen images (event lists, suggested profiles, feed posts) | 🔲 Pending | Medium | Reduces initial page load bandwidth significantly on feed-heavy pages |
| 9 | **Bundle splitting** — All pages are in a single chunk. Add `React.lazy()` + `Suspense` for route-level code splitting (especially heavy pages like CreateEvent, EditEvent, Dashboard) | 🔲 Pending | Medium | Can reduce initial JS payload by 30-50% |
| 10 | **N+1 post interactions** — Each feed post fires 4 separate queries (like count, repost count, my like, my repost). Should batch into a single RPC | ⚠️ High Priority | High | 10 posts = 40+ queries on feed load |

---

## Backend / Edge Function Performance

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 11 | **Rate limit cleanup runs on 5% of requests** — `check_rate_limit` calls `cleanup_old_rate_limits()` randomly. Consider a scheduled cron or pg_cron job instead | 🔲 Pending | Low | Removes unpredictable latency spikes from auth paths |
| 12 | **Edge function cold starts** — Each function creates a new Supabase client on every request. Consider connection pooling or reusing clients at module scope | 🔲 Pending | Medium | Module-level client init runs once per isolate, not per request |
| 13 | **Avatar generation blocks registration** — `generateAndUploadInitialsAvatar` runs synchronously in the register function. Could be deferred to a background task/webhook | 🔲 Pending | Medium | Saves ~200-500ms on registration path |
| 14 | **Phone normalization repeated across functions** — `check-phone`, `login`, `register` all do the same phone normalization + multi-format OR query. Extract to shared utility | 🔲 Pending | Low | Code quality / maintainability, not direct perf |

---

## Database / Query Optimisation

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 15 | **Add index on `profiles.username`** — username uniqueness check in registration does a full scan. Add a unique index | 🔲 Pending | Medium | Speeds up registration + profile lookups by username |
| 16 | **Add index on `profiles.phone`** — phone lookups use OR across multiple formats. Single index on normalized phone | ✅ Done | Medium | Unique index exists |
| 17 | **Organiser profile queries** — Dashboard loads organiser profiles, then separately loads events, then separately loads follower counts. Could use a single RPC or join query | 🔲 Pending | Low | Reduces waterfall on dashboard page |
| 18 | **Create `get_user_group_chats` RPC** — Dashboard calls this non-existent function. Must be created | ⚠️ Blocking | High | Build error — messages page broken |

---

## Resource Efficiency

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 19 | **Unused dependencies audit** — Check for packages imported but not used (e.g., `recharts` is used by `RevenueChart`) | 🔲 Pending | Low | Reduces bundle size |
| 20 | **Image optimisation** — Event flyer assets in `src/assets/` are full-resolution JPGs. Convert to WebP and/or serve via Supabase Storage with transforms | 🔲 Pending | Medium | Could reduce image payload by 50-70% |
| 21 | **Supabase Realtime audit** — Tables in `supabase_realtime` publication: posts, post_reposts, event_messages, notifications, user_points. Verify all are needed | 🔲 Pending | Low | Each subscription = 1 WebSocket channel |
| 22 | **Dead code removal** — `src/infrastructure/queue.ts` (unused), `src/features/identity/services/authorization.ts` (dead frontend code), `src/features/orders/index.ts` (empty) | 🔲 Pending | Low | Bundle size + clarity |

---

*Last updated: 13 March 2026*
