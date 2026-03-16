# Flutter Migration Changelog

<!-- New entries -->

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
