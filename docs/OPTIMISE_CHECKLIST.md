# Platform Optimisation Checklist

> Living document — prioritised by impact. ✅ = done, 🔲 = pending, 🔜 = next up

---

## Auth / Login Performance

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 1 | **Fix `rate_limits` unique indexes** — ON CONFLICT was failing on every auth call due to missing partial unique indexes | ✅ Done | Medium | Added partial unique indexes + updated `check_rate_limit` function with matching WHERE clauses |
| 2 | **Replace magic-link session creation with `signInWithPassword`** — login was chaining 5 sequential calls (profile lookup → getUserById → verifyPassword → generateLink → verifyOtp). Now uses phone-based `signInWithPassword` (single call) | ✅ Done | High | Eliminates 2 network round-trips. Lazy password migration on first login for existing users |
| 3 | **Merge `check-phone` + `login` into single call for returning users** — PhoneStep calls `checkPhone`, then PasswordStep calls `login` which re-does the phone lookup. Could skip check-phone entirely when user submits a password | 🔲 Pending | Medium | Front-end UX change — needs Haan's input on flow design. Could show password field inline or use a single "phone + password" form for returning users |

---

## Frontend Performance

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 4 | **Suggested profiles query runs outside React Query** — `Index.tsx` uses a raw `useEffect` + `useState` to fetch suggested profiles instead of `useQuery`, bypassing cache and deduplication | 🔲 Pending | Low | Convert to a `useSuggestedProfiles` hook with `useQuery` for caching + stale-while-revalidate |
| 5 | **Static event data import** — `Index.tsx` imports `events` from `@/data/events` (hardcoded mock data) alongside real DB events. This creates confusion and unused bundle weight | 🔲 Pending | Low | Remove mock data imports once all pages use real DB queries |
| 6 | **Image lazy loading** — Event flyers and avatar images load eagerly. Add `loading="lazy"` to off-screen images (event lists, suggested profiles, feed posts) | 🔲 Pending | Medium | Reduces initial page load bandwidth significantly on feed-heavy pages |
| 7 | **Bundle splitting** — All pages are likely in a single chunk. Add `React.lazy()` + `Suspense` for route-level code splitting (especially heavy pages like CreateEvent, EditEvent, Dashboard) | 🔲 Pending | Medium | Can reduce initial JS payload by 30-50% |
| 8 | **React Query `staleTime` tuning** — Profile and event queries have no `staleTime` set, meaning they refetch on every mount. Setting 30-60s staleTime for stable data (profiles, events) reduces redundant requests | 🔲 Pending | Medium | Particularly impactful on navigation-heavy flows (profile → event → back) |

---

## Backend / Edge Function Performance

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 9 | **Rate limit cleanup runs on 5% of requests** — `check_rate_limit` calls `cleanup_old_rate_limits()` randomly. Consider a scheduled cron or pg_cron job instead | 🔲 Pending | Low | Removes unpredictable latency spikes from auth paths |
| 10 | **Edge function cold starts** — Each function creates a new Supabase client on every request. Consider connection pooling or reusing clients at module scope | 🔲 Pending | Medium | Module-level client init runs once per isolate, not per request |
| 11 | **Avatar generation blocks registration** — `generateAndUploadInitialsAvatar` runs synchronously in the register function. Could be deferred to a background task/webhook | 🔲 Pending | Medium | Saves ~200-500ms on registration path |
| 12 | **Phone normalization repeated across functions** — `check-phone`, `login`, `register` all do the same phone normalization + multi-format OR query. Extract to shared utility | 🔲 Pending | Low | Code quality / maintainability, not direct perf |

---

## Database / Query Optimisation

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 13 | **Add index on `profiles.username`** — username uniqueness check in registration does a full scan. Add a unique index | 🔲 Pending | Medium | Speeds up registration + profile lookups by username |
| 14 | **Add index on `profiles.phone`** — phone lookups use OR across multiple formats. A single index on the normalized phone column would help | 🔲 Pending | Medium | Already noted in memory but worth verifying index exists |
| 15 | **Organiser profile queries** — Dashboard loads organiser profiles, then separately loads events, then separately loads follower counts. Could use a single RPC or join query | 🔲 Pending | Low | Reduces waterfall on dashboard page |

---

## Resource Efficiency

| # | Item | Status | Impact | Notes |
|---|------|--------|--------|-------|
| 16 | **Unused dependencies audit** — Check for packages imported but not used (e.g., `recharts` if no charts are rendered yet) | 🔲 Pending | Low | Reduces bundle size |
| 17 | **Image optimisation** — Event flyer assets in `src/assets/` are full-resolution JPGs. Convert to WebP and/or serve via Supabase Storage with transforms | 🔲 Pending | Medium | Could reduce image payload by 50-70% |
| 18 | **Supabase Realtime** — `supabase_realtime` publication exists but may have tables added that don't need real-time. Audit and remove unnecessary subscriptions | 🔲 Pending | Low | Reduces WebSocket overhead |
