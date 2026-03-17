# Flutter Migration Changelog

<!-- New entries -->

### 2026-03-16 — Comprehensive Testing Phases (Unit + E2E)

**Files changed:** `src/test/test-utils.tsx`, `src/hooks/*.test.ts`, `src/features/*/repositories/*.test.ts`, `src/features/*/services/*.test.ts`, `src/components/*.test.tsx`, `tests/e2e/auth.setup.ts`, `tests/e2e/*.spec.ts`, `playwright.config.ts`, `docs/TESTING_GUIDE.md`, `.gitignore`

**What changed (React/TS):**
- **Phase 1 (Unit):** Full test coverage: hooks (useProfileQuery, useEventsQuery, useForYouEvents, useUserEventsQuery, usePostsQuery, useTicketTiers, useStripeConnectStatus, useDashboardAnalytics); repositories (events, identity, posts); services (identity, feed); components (TicketEventCard, PurchaseModal, PhoneStep, OtpStep, ProtectedRoute, LoadingSpinner, EventCard, FeedPost, BottomNav). Test utils: `renderWithProviders` with QueryClient + Router.
- **Phase 2 (E2E):** Auth setup (`auth.setup.ts`) performs dev login (Dylan), saves `storageState` to `tests/.auth/user.json`. Playwright projects: setup, chromium (unauthenticated for auth.spec), chromium-authenticated (profile, dashboard, tickets, event-detail, checkout). Expanded specs for auth, profile, dashboard, tickets; new event-detail and checkout specs.
- **TESTING_GUIDE.md:** E2E prerequisites; dev login user IDs (Dylan, Haan).

**Flutter migration notes:**
- No direct Flutter impact. For Flutter: replicate unit tests with flutter_test; E2E with integration_test or Patrol.

### 2026-03-16 — Testing & CI: Vitest, Playwright, smoke test

**Files changed:** `package.json`, `vitest.config.ts`, `playwright.config.ts`, `src/test/setup.ts`, `src/utils/fileValidation.test.ts`, `src/utils/validation.test.ts`, `src/hooks/useOrderFlow.test.ts`, `src/components/CategoryPill.test.tsx`, `tests/e2e/auth.spec.ts`, `tests/e2e/profile.spec.ts`, `tests/e2e/tickets.spec.ts`, `tests/e2e/dashboard.spec.ts`, `.github/workflows/ci.yml`, `.cursor/rules/smoke-test.mdc`, `.env.example`

**What changed (React/TS):**
- Vitest + React Testing Library: unit tests for `fileValidation`, `validation`, `useOrderFlow`, `CategoryPill`.
- Playwright: E2E specs for auth (/auth), profile (/profile redirect), tickets (/events redirect), dashboard (/ load).
- CI: lint → unit tests → build; `VITE_STRIPE_PUBLISHABLE_KEY` env for build.
- Smoke: `npm run smoke` = test + build; `.cursor/rules/smoke-test.mdc` for reproducible verification.

**Flutter migration notes:**
- No direct Flutter impact. For Flutter: use equivalent testing stack (flutter_test, integration_test, Patrol) and CI workflow.

### 2026-03-16 — Backend stages 2–8: refunds, feed discipline, check-in QR, file validation

**Files changed:** `supabase/functions/refunds-create/`, `supabase/functions/orders-cancel/`, `supabase/functions/checkin-qr/`, `supabase/functions/events-update/`, `supabase/functions/message-send/`, `supabase/functions/_shared/refund.ts`, `supabase/functions/_shared/rate-limit.ts`, `src/features/social/services/feedService.ts`, `src/features/events/repositories/eventsRepository.ts`, `src/features/social/repositories/postsRepository.ts`, `src/features/social/repositories/connectionsRepository.ts`, `src/hooks/useForYouEvents.ts`, `src/hooks/usePostsQuery.ts`, `src/pages/EventCheckIn.tsx`, `src/components/QrScanner.tsx`, `src/utils/fileValidation.ts`, `src/lib/stripe.ts`, `docs/LOVABLE_PROMPTS.md`, `docs/PAYMENT_FLOW.md`, `docs/BACKEND_TODO.md`, `docs/STRIPE_TODO.md`, `docs/CLEANUP_ARCHITECTURE_TODO.md`, `docs/DEV_CONTEXT.md`, `docs/SECURITY_CHECKLIST.md`

**What changed (React/TS):**
- **Refunds:** `refunds-create` edge function; `orders-cancel` for reserved orders; event delete triggers bulk refunds via `processRefund`.
- **Feed discipline:** feedService uses only repositories; useForYouEvents uses `fetchForYouEvents`; postsRepository.getPostsForFeed, getRepostsForFeed, getPostsByIds; eventsRepository.getNearbyEvents, getUpcomingEventsByIds, getEventIdsByGoingUserIds.
- **Blocked users:** connectionsRepository.getBlockedUserIds; filtered in feedService and usePostsQuery.
- **Rate limiting:** event-message-send in message-send edge function.
- **Stripe:** publishable key from `VITE_STRIPE_PUBLISHABLE_KEY`.
- **Check-in QR:** `checkin-qr` edge function validates ticket qr_code, upserts check_ins, updates tickets.checked_in_at; EventCheckIn camera scanner via html5-qrcode; success screen with "Scan next".
- **File validation:** validateImageFile/validateImageFileOrMessage in avatar, post image, event flyer, event media uploads.

**Flutter migration notes:**
- Refunds: call `refunds-create` with order_id, reason; `orders-cancel` for reserved orders. Event delete must refund confirmed orders first.
- Feed: use feedService/repositories; filter blocked users in feed.
- Check-in: `checkin-qr` accepts qr_code + event_id; returns display_name on success. Use mobile QR scanner (e.g. mobile_scanner) for ticket QR.
- File uploads: validate type (jpeg, png, webp) and size (5MB) before upload.
- Stripe: use env var for publishable key.

### 2026-03-17 — Event visibility and profile privacy (Stage 1)

**Files changed:** `src/features/events/repositories/eventsRepository.ts`, `src/features/social/services/feedService.ts`, `src/hooks/useForYouEvents.ts`, `src/hooks/usePostsQuery.ts`, `src/pages/Profile.tsx`, `src/pages/UserProfile.tsx`, `supabase/migrations/20260317130000_fix_is_profile_public.sql`, `docs/LOVABLE_PROMPTS.md`, `docs/BACKEND_TODO.md`, `docs/SECURITY_CHECKLIST.md`

**What changed (React/TS):**
- Event queries: add `status='published'` and `(publish_at IS NULL OR publish_at <= now())` to all public event listings (eventsRepository list/search/_searchFreeEvents, feedService fetchNearbyEvents, useForYouEvents, Profile, UserProfile). Draft/scheduled events no longer appear in public views.
- getEventSummariesByIds: optional `publicOnly` param for feed enrichment.
- Migration: fix `is_profile_public()` to check `profile_tier = 'professional'` (personal = private). Apply via Lovable using docs/LOVABLE_PROMPTS.md.

**Flutter migration notes:**
- When querying events for public display, filter by status and publish_at. Use `profile_tier` for profile visibility (personal = private, professional = public).
- Replicate `is_profile_public` RPC logic in Dart if using custom profile visibility.

### 2026-03-16 — Set up payouts: error handling and debugging

**Files changed:** `supabase/functions/stripe-connect-onboard/index.ts`, `docs/STRIPE_TODO.md`

**What changed (React/TS):**
- stripe-connect-onboard: early validation for STRIPE_SECRET_KEY; email check for new Express accounts; JSON body parse handling; RPC error handling; getUserFacingError() returns actionable messages (Stripe not configured, invalid key, email required, etc.) instead of generic "Internal server error"
- STRIPE_TODO: added "Set up payouts troubleshooting" section (STRIPE_SECRET_KEY, deploy steps, email requirement)

**Flutter migration notes:**
- No new Flutter migration work — edge function only. Flutter app calling `stripe-connect-onboard` will now receive clearer error messages in the API response.
- When replicating in Dart: surface the `error` field from the edge function response in the UI; ensure users add email before payout setup if using phone-only auth.

### 2026-03-16 — Payment webhook discipline (CLEANUP §6)

**Files changed:** `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/_shared/job-handlers.ts`, `docs/PAYMENT_FLOW.md`, `docs/CLEANUP_ARCHITECTURE_TODO.md`

**What changed (React/TS):**
- stripe-webhook: check `payment_events.insert` result; return 500 on failure so Stripe retries; general errors in try block now return 500 for retry
- job-handlers: added `edgeLog` success log for `tickets.issue` (order_id, quantity)
- PAYMENT_FLOW.md: added "Queue and Follow-Up Jobs" section (maxAttempts=3, exhaustion behavior, manual recovery); clarified webhook retry (500 on critical failures)
- CLEANUP_ARCHITECTURE_TODO: §6 marked implemented with summary

**Flutter migration notes:**
- No new Flutter migration work — backend/edge function and docs only. Flutter app continues to use same checkout flow and Stripe webhook endpoint.
- If building Flutter checkout: ensure `stripe-webhook` env/config matches; order confirmation remains webhook-driven, not client-driven.

### 2026-03-16 — Payment onboarding touchpoints (Stripe Connect)

**Files changed:** `src/pages/OnboardingRequired.tsx`, `src/components/create-event/TicketingPanel.tsx`, `src/pages/CreateEvent.tsx`, `src/components/OrganiserPayoutTask.tsx` (new), `src/components/PhoneFrame.tsx`, `src/components/PayoutSetupSection.tsx`, `supabase/functions/stripe-connect-onboard/index.ts`, `docs/PAYMENT_FLOW.md` (new), `docs/STRIPE_TODO.md`, `docs/BACKEND_TODO.md`

**What changed (React/TS):**
- Fixed OnboardingRequired: pass `organiserProfileId` to `useStripeConnectOnboard`, add loading states for "Set up payouts" and "Save as draft".
- Stripe Connect return URLs: `/organiser/edit` → `/profile/edit-organiser` in `stripe-connect-onboard`.
- TicketingPanel: added "Set up payouts" button in the payouts-not-ready alert; CreateEvent passes `organiserProfileId` and `onStartOnboarding` from `useStripeConnectOnboard`.
- New OrganiserPayoutTask: floating collapsible pill for organisers with incomplete payouts; rendered in PhoneFrame.
- PayoutSetupSection refactored to use `useStripeConnectOnboard` instead of inline `callEdgeFunction`.
- All touchpoints (PayoutSetupSection, OnboardingRequired, TicketingPanel, OrganiserPayoutTask) use the same `useStripeConnectOnboard` flow.
- Added `docs/PAYMENT_FLOW.md` with webhook URL, handled events, order lifecycle, idempotency, retry behavior.

**Flutter migration notes:**
- Use a shared Stripe Connect onboarding flow: call `stripe-connect-onboard` edge function, redirect to returned URL, return to `/profile/edit-organiser?stripe_onboard=complete`.
- Replicate touchpoints: Edit Organiser Profile (PayoutSetupSection), OnboardingRequired page (`/create/onboarding-required`), TicketingPanel "Set up payouts" button, floating OrganiserPayoutTask when `!charges_enabled`.
- Route: `/create/onboarding-required` — shown when user tries to create paid event without onboarding; options: "Set up payouts" (redirect) or "Save as draft" (creates event with free tiers only).
- `useStripeConnectStatus` and `useStripeConnectOnboard` hooks — replicate in Dart with `supabase_flutter` functions.invoke for `stripe-connect-status` and `stripe-connect-onboard`.

### 2026-03-17 — Fix group chat and DM messages not appearing after send

**Files changed:** `src/pages/MessageThread.tsx`, `src/pages/DmThread.tsx`, `supabase/migrations/20260317120000_group_chat_messages_realtime.sql`

**What changed (React/TS):**
- Added optimistic updates to group chat and DM message send: messages appear in the list immediately before the server round trip completes.
- Added try/catch with toast on send failure so insert/network errors are surfaced to the user.
- If send fails, the optimistic message is rolled back from the UI.
- Added Realtime publication for `group_chat_messages` (migration) so multi-user group chats update live across clients.

**Flutter migration notes:**
- Use optimistic updates (Riverpod/Bloc) to add messages to the list immediately on send.
- Ensure `group_chat_messages` is in the Supabase Realtime publication for cross-device sync.
- Surface send errors with a snackbar or toast.

### 2026-03-16 — Fix expired token + notification count optimistic updates

**Files changed:** `src/infrastructure/api-client.ts`, `src/hooks/useNotificationsQuery.ts`

**What changed (React/TS):**
- Fixed `callEdgeFunction` to proactively refresh the session when the access token expires within 60 seconds, preventing "Invalid token" errors on all edge function calls.
- Added optimistic updates to `useMarkNotificationRead` and `useMarkAllRead` — the badge count now updates instantly when notifications are marked as read, without waiting for the server round trip.
- Unique realtime channel names per user/profile to avoid subscription conflicts.
- Shared `notificationsKey` helper for consistent query key usage.

**Flutter migration notes:**
- In `supabase_flutter`, token refresh is handled automatically by the SDK — no manual refresh needed.
- For optimistic notification updates, use Riverpod/Bloc state to immediately mark notifications as read in local state before the API call completes.

### 2026-03-16 — Revert repositories from undeployed edge functions to direct Supabase

**Files changed:** `src/features/messaging/repositories/messagingRepository.ts`, `src/features/events/repositories/eventManagementRepository.ts`, `src/features/social/repositories/organiserTeamRepository.ts`, `src/features/social/repositories/postsRepository.ts`

**What changed (React/TS):**
- Reverted all write operations back to direct Supabase inserts/updates/deletes instead of routing through undeployed edge functions (`message-send`, `group-chat-manage`, `event-media-manage`, `organiser-team-manage`, `moderation-block`, `report-create`).
- Fixed: group chat messaging (send), DM messaging (send), event board messaging (send), add/remove group members, rename group chats, update member counts, event media management, organiser team invites/removes/role updates, user blocking, post reporting.
- `updateGroupMemberCount` restored as a real DB operation (was a no-op stub).

**Flutter migration notes:**
- Use `supabase_flutter` direct table operations for these writes until edge functions are deployed.
- Group messages: insert into `group_chat_messages` with `sender_id`, `sender_name`, `content`, `is_from_current_user: true`.
- DMs: insert into `dm_messages` with `thread_id`, `sender_id`, `content`.
- Event messages: insert into `event_messages` with `event_id`, `user_id`, `content`.
- Block user: insert into `blocked_users` with `blocker_id`, `blocked_id`.
- Report post: insert into `reports` with `reporter_id`, `reported_user_id`, `target_type`, `target_id`, `reason`.

### 2026-03-16 — Switch ticket transfer back to rsvp_transfer RPC

**Files changed:** `src/components/TransferTicketModal.tsx`, `src/integrations/supabase/types.ts`

**What changed (React/TS):**
- Reverted `TransferTicketModal` from `callEdgeFunction('ticket-transfer', ...)` back to `supabase.rpc("rsvp_transfer", ...)` now that the migration is deployed.
- Added `rsvp_transfer` type to the Supabase generated types (`Functions` section).

**Flutter migration notes:**
- Use `supabase_flutter`'s `.rpc('rsvp_transfer', params: {'p_event_id': eventId, 'p_to_user_id': recipientId})` for ticket/RSVP transfers.
- The RPC is `SECURITY DEFINER`, handles auth checks, friend validation, and atomic transfer in one transaction.
- No edge function call needed for this operation.

### 2026-03-16 — Fix notification unread count mismatch

**Files changed:** `src/hooks/useNotificationsQuery.ts`, `src/pages/Notifications.tsx`, `src/features/notifications/index.ts`

**What changed (React/TS):**
- Fixed `useUnreadCount` to exclude hidden notification types (`suggested_account`) so the badge count matches the visible notification list.
- Extracted `HIDDEN_NOTIFICATION_TYPES` as a shared constant from the hook file, replacing the local `HIDDEN_TYPES` in `Notifications.tsx`.
- Added a "Mark all as read" button (CheckCheck icon) to the Notifications page header, using the existing `useMarkAllRead` hook that was previously unused.

**Flutter migration notes:**
- In the Flutter notifications screen, ensure the unread badge count applies the same type filter as the visible list.
- Add a "Mark all as read" action in the app bar (e.g. `IconButton` with `Icons.done_all`).
- Use `supabase_flutter` to batch-update `read: true` on all matching notifications.

### 2026-03-16 — Developer context files for AI agent consistency

**Files changed:** `.cursor/rules/dev-context.mdc` (new), `docs/DEV_CONTEXT.md` (new)

**What changed (React/TS):**
- Created `.cursor/rules/dev-context.mdc` — auto-loaded Cursor rule file with all coding standards, architecture rules, repository pattern, edge function conventions, and commit checklist.
- Created `docs/DEV_CONTEXT.md` — human-readable companion with architecture diagrams, quick reference tables, and links to all other docs.

**Flutter migration notes:**
- No new Flutter migration work — documentation/tooling only.
- The dev context files document patterns that should be mirrored in the Flutter app (repository pattern, structured logging, edge function calls via `supabase_flutter`).

### 2026-03-16 — Comprehensive docs cleanup and architecture documentation update

**Files changed:** `docs/ARCHITECTURE.md`, `docs/DATABASE_ARCHITECTURE.md`, `docs/BACKEND_TODO.md`, `docs/OPTIMISE_CHECKLIST.md`, `docs/DB_OPTIMISATION_CHECKLIST.md`, `docs/SECURITY_CHECKLIST.md`

**What changed (React/TS):**
- Deleted `docs/CHAT_PROMPT_MIGRATION.md` (completed migration guide) and `docs/CLEANUP_REVIEW.md` (superseded by `CLEANUP_ARCHITECTURE_TODO.md`).
- Updated `ARCHITECTURE.md`: added Infrastructure Layer section, Request Correlation docs, 11 repositories table, 42 edge functions (was 40), removed resolved `get_user_group_chats` risk.
- Fixed `get_user_group_chats` RPC references across 5 docs files — now marked as done (exists in migration `20260312130000`).
- Updated `SECURITY_CHECKLIST.md` with 5 new edge-function-backed write tables and operations.
- All docs updated to `2026-03-16` timestamps.

**Flutter migration notes:**
- No new Flutter migration work — documentation-only changes.
- The updated `ARCHITECTURE.md` serves as the primary reference for Flutter app architecture planning.

### 2026-03-16 — Structured logging, error envelopes, and edge functions for sensitive writes

**Files changed:** `src/infrastructure/api-client.ts`, `src/infrastructure/errors.ts`, `src/infrastructure/errorCapture.ts`, `supabase/functions/_shared/response.ts` (new), all 39 `supabase/functions/*/index.ts`, `src/features/social/repositories/postsRepository.ts`, `src/features/social/repositories/organiserTeamRepository.ts`, `src/features/messaging/repositories/messagingRepository.ts`, `src/features/events/repositories/eventManagementRepository.ts`, `src/features/events/repositories/eventsRepository.ts`, `src/features/support/repositories/supportRepository.ts`, `src/features/notifications/repositories/notificationsRepository.ts`, `src/features/social/repositories/connectionsRepository.ts`, `supabase/functions/moderation-block/index.ts` (new), `supabase/functions/organiser-team-manage/index.ts` (new), `supabase/functions/group-chat-manage/index.ts` (new), `supabase/functions/event-media-manage/index.ts` (new), `supabase/functions/message-send/index.ts` (new), `docs/CLEANUP_ARCHITECTURE_TODO.md`

**What changed (React/TS):**
- `api-client.ts` restored: generates `X-Request-ID` per request, structured logging via `createLogger`, calls `captureApiError` on failures.
- All 8 repository files with write methods now use `createLogger` with structured "who/what/outcome" log lines on every write.
- `parseApiError` in `errors.ts` now extracts `request_id` from edge function error responses for client-side correlation.
- All 39 edge functions migrated to shared `edgeLog`, `getRequestId`, `errorResponse`, and `successResponse` helpers from `_shared/response.ts`.
- 5 new edge functions created: `moderation-block`, `organiser-team-manage`, `group-chat-manage`, `event-media-manage`, `message-send`.
- Repository write methods for sensitive operations (report, block, team management, chat membership, media, messaging) now call edge functions via `callEdgeFunction` instead of direct Supabase client writes.

**Flutter migration notes:**
- **Logging:** Use `logger` package in Dart. Create a `createLogger(context)` factory that mirrors the TS version. For edge function correlation, pass `X-Request-ID` header in all `supabase_flutter` function invocations.
- **Edge function calls:** Use `Supabase.instance.client.functions.invoke()` from `supabase_flutter`. The 5 new edge functions (`moderation-block`, `organiser-team-manage`, `group-chat-manage`, `event-media-manage`, `message-send`) need equivalent Dart repository methods that invoke them.
- **Error handling:** Parse `request_id` from error response bodies in the Dart API client layer; use it for correlation in crash reporting (e.g., Sentry/Crashlytics).
- **Repository pattern:** Dart repositories should follow the same pattern — `callEdgeFunction` wrapper for sensitive writes, direct Supabase client for reads. Use Riverpod/Bloc providers to inject repositories.
- **Shared response format:** All edge functions now return `{ error, code?, request_id?, details? }` on error and `{ ...data, request_id? }` on success. Dart response parsing should handle this envelope.

### 2026-03-16 — Architecture cleanup: single Supabase boundary, repository layer, structured logging

**Files changed:** `src/infrastructure/supabase.ts`, `src/infrastructure/errorCapture.ts`, `src/infrastructure/api-client.ts`, `supabase/functions/_shared/logger.ts`, `src/features/social/repositories/postsRepository.ts`, `src/features/social/repositories/connectionsRepository.ts`, `src/features/social/repositories/profilesRepository.ts`, `src/features/social/repositories/organiserTeamRepository.ts`, `src/features/messaging/repositories/messagingRepository.ts`, `src/features/events/repositories/eventManagementRepository.ts`, `src/features/events/repositories/eventsRepository.ts`, `src/features/support/repositories/supportRepository.ts`, `src/features/notifications/repositories/notificationsRepository.ts`, ~30 pages/components/hooks (import path migration), `src/features/social/services/feedService.ts`, `supabase/functions/ticket-transfer/index.ts`, `docs/CLEANUP_ARCHITECTURE_TODO.md`

**What changed (React/TS):**
- All Supabase client imports centralized through `@/infrastructure/supabase` (single seam for testing/mocking).
- Created `errorCapture.ts` with `captureApiError` (Sentry placeholder) and `api-client.ts` now generates X-Request-ID per request with structured logging.
- Created 8 new domain repositories (posts, connections, profiles, organiserTeam, messaging, eventManagement, support, notifications) that encapsulate all `supabase.from()` calls.
- Migrated all direct `supabase.from()` calls out of pages, components, and hooks into repository methods.
- Share-to-friend notification flow moved to `callEdgeFunction('notifications-send')` instead of direct table insert.
- `ticket-transfer` edge function now uses structured `edgeLog` with request ID correlation.

**Flutter migration notes:**
- Repository pattern maps directly to Dart repository classes using `supabase_flutter`. Create equivalent repos under `lib/features/*/repositories/`.
- The `callEdgeFunction` pattern maps to `Supabase.instance.client.functions.invoke()` in `supabase_flutter`.
- Structured logging: use `logger` package in Dart; for edge functions, the shared logger pattern applies to any Dart backend/cloud functions.
- No new routes to register in `go_router`.
- No new Supabase calls — this is a refactor of existing calls into a repository layer.
- State management: repositories can be provided via Riverpod providers (`Provider` or `FutureProvider`) for dependency injection.
