# Flutter Migration Changelog

<!-- New entries -->

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
