# Up2 — Cleanup & Architecture To-Do

Single reference for logging, DB boundary, repositories, edge writes, MOM, and cross-cutting concerns. Work in the order that unblocks the rest (e.g. single DB client before full repo migration).

---

## 1. Single Supabase / infra boundary (do first) ✅ Implemented

**Implementation summary:** Single canonical Supabase client exported from `infrastructure/supabase.ts`, all app code now imports from `@/infrastructure/supabase`, and `integrations/supabase/client` is internal-only so UI code never talks to Supabase directly.

---

## 2. DB only via repositories ✅ Implemented

**Implementation summary:** All `supabase.from()` calls have been moved out of pages, components, and hooks into domain repositories. Eight repos now own all table access: `notificationsRepository`, `eventsRepository` (+ `eventManagementRepository`), `postsRepository`, `connectionsRepository`, `messagingRepository`, `profilesRepository`, `organiserTeamRepository`, and `supportRepository`. UI code calls repos/services only; `supabase` imports in pages/components are limited to `.storage` (file uploads) and `.rpc` (aggregation RPCs).

---

## 3. Logging & error capture ✅ Implemented

**Implementation summary:** All 39 repository write methods have structured `createLogger` logging with "who/what/outcome" context. `api-client.ts` generates `X-Request-ID` per request and calls `captureApiError` on failures. All 39 edge functions use `edgeLog` from `_shared/logger.ts` with `X-Request-ID` correlation, and return standardized `{ error, code?, request_id?, details? }` envelopes via shared `_shared/response.ts` helpers (`errorResponse`, `successResponse`, `getRequestId`). `parseApiError` in `errors.ts` extracts `request_id` from edge responses for client-side correlation.

---

## 4. Edge writes only for sensitive mutations ✅ Implemented

**Implementation summary:** All sensitive write paths now go through dedicated edge functions instead of direct Supabase client calls:
- **Moderation:** `reportPost` → `report-create` edge fn; `blockUser` → `moderation-block` edge fn
- **Organiser team:** `inviteMember`, `removeMember`, `updateRole` → `organiser-team-manage` edge fn
- **Group chat membership:** `addGroupMembers`, `removeGroupMember`, `updateGroupChatName` → `group-chat-manage` edge fn; member count updated atomically server-side
- **Event media:** `insertMedia`, `deleteMedia` → `event-media-manage` edge fn
- **Messaging:** `sendDm`, `sendGroupMessage`, `sendEventMessage` → `message-send` edge fn
- Pre-existing: `notifications-send`, `ticket-transfer`, payments/orders, events CRUD, RSVP, and profiles were already behind edge functions

---

## 5. Actor context / profile-switching — Documented

**Implementation summary:** Actor convention documented in `.cursor/rules/dev-context.mdc` (Section 5) and `docs/DEV_CONTEXT.md`. Tables with actor columns: `posts`, `notifications`, `dm_threads`, `event_cohosts`, `events`. Notifications carry `organiser_profile_id` end-to-end. Future: audit remaining write paths (reports, support, etc.) for actor columns if organiser-initiated actions are added.

---

## 6. Payment / webhook discipline ✅ Implemented

**Implementation summary:** `docs/PAYMENT_FLOW.md` documents webhook URL, handled events, order lifecycle, ticket issuance path, idempotency, and retry behavior. `stripe-webhook` is the single entry for Stripe; `payment_events` idempotency with `stripe_event_id`; returns 500 on `payment_events.insert` failure so Stripe retries (idempotency ensures no double-processing). Order lifecycle steps use `edgeLog` with `requestId`; `tickets.issue` handler logs success per order. Queue uses `maxAttempts: 3`; exhaustion logs and discards; manual recovery for edge cases noted in PAYMENT_FLOW.

**Goal:** Explicit ownership of order lifecycle, ticket issuance, and payment confirmation; logging and error handling are production-grade.

- [x] **6.1** **Document**
  - Document in this repo or ARCHITECTURE: webhook URL, which events are handled, order states, ticket issuance path, and payment confirmation path.
- [x] **6.2** **Webhook**
  - Ensure `stripe-webhook` is the single entry for Stripe; idempotency (e.g. payment_events) is used; failures log with correlation ID and retry policy is clear.
- [x] **6.3** **Order lifecycle**
  - Reserve → PaymentIntent → confirmPayment → webhook → order confirmed → tickets issued (via queue). Ensure every step is logged and errors are captured.
- [x] **6.4** **Ticket issuance**
  - Ticket creation lives in queue job (e.g. `tickets.issue`) triggered by webhook; no client path that creates tickets for paid orders. Log success/failure per order.
- [x] **6.5** **Retries**
  - Webhook follow-up work (tickets, RSVP, loyalty) goes through the queue with retries; document max attempts and failure behavior (e.g. alert, manual fix).

**Success:** One documented flow; webhook and order/ticket paths logged and retried; no silent failures.

---

## 7. Feed / social repository discipline

**Goal:** All feed and social reads go through service/repository; public feed path is DB-backed and unauthenticated visibility is correct.

- [x] **7.1** **Feed sources**
  - Home feed, "for you", nearby events routed through feedService; feedService uses postsRepository and eventsRepository only.
- [x] **7.2** **Public feed**
  - Public event visibility via eventsRepository filters (status, publish_at).
- [x] **7.3** **Feed service**
  - `feedService` uses only repositories for DB access; no direct Supabase table reads.

**Success:** Single feed entry point through service/repo; clear public vs authenticated behaviour.

---

## 8. MOM: Cloud Tasks first, Pub/Sub later

**Goal:** Replace in-process queue with Cloud Tasks for retries, delayed jobs, cleanup, and webhook follow-ups; reserve Pub/Sub for multi-subscriber/fanout later.

- [ ] **8.1** **Design**
  - Define Cloud Tasks queue(s) (e.g. one for notifications, one for webhook follow-ups, one for cleanup) and document which job types map to which queue.
- [ ] **8.2** **Adapter**
  - Implement a Cloud Tasks adapter that satisfies the same interface as the current in-process queue (e.g. `enqueue(type, payload, options)`) and optionally supports delay.
- [ ] **8.3** **Edge**
  - In `supabase/functions/_shared/queue.ts`, replace in-process execution with HTTP POST to Cloud Tasks (or Supabase-invoked function that enqueues to Cloud Tasks). Keep job types and payloads unchanged.
- [ ] **8.4** **Handlers**
  - Worker (or edge function) that receives Cloud Tasks HTTP requests and runs existing job handlers; use same handler registry and service client.
- [ ] **8.5** **Use cases**
  - Retries: failed jobs re-enqueued with backoff via Cloud Tasks.
  - Delayed jobs: notifications, reminders, cleanup scheduled with delay.
  - Webhook follow-ups: tickets.issue, rsvp.auto_mark_going, loyalty.award_points enqueued from webhook and processed by worker.
  - Cleanup: expired orders, expired notifications triggered on a schedule (e.g. cron → enqueue cleanup job).
- [ ] **8.6** **Pub/Sub**
  - Do not introduce Pub/Sub until there is a concrete need (multiple independent subscribers, fanout, event-driven across services). Document "Cloud Tasks first, Pub/Sub when needed" in RESELL_TICKETS_PLAN or a dedicated MOM doc.

**Success:** No in-process queue for production; all async work via Cloud Tasks with retries and delays; webhook and cleanup paths use it.

---

## 9. Summary checklist (priority order)

1. **Single Supabase / infra boundary** ✅ — one DB client source, one import path.
2. **DB only via repositories** ✅ — migrate all direct `supabase.from(...)` in app code to repos; enforce "only repos touch DB".
3. **Logging & errors** ✅ — request/service/edge logging, correlation IDs, centralized error capture, Sentry, standardized error envelopes.
4. **Edge for sensitive writes** ✅ — notifications, group membership, event media, organiser members, moderation behind Edge.
5. **Actor context** — all organiser/personal writes carry actor_type / actor_profile_id / owner_user_id where relevant.
6. **Payment / webhook** ✅ — documented flow, idempotency, logging, retries for orders and ticket issuance.
7. **Feed via service/repo** — all feed reads through one service/repo layer; clear public vs authenticated behaviour.
8. **Cloud Tasks** — replace in-process queue with Cloud Tasks; use for retries, delays, webhook follow-ups, cleanup; defer Pub/Sub.

---

*Last updated: 2026-03-17*
