# Testing Guide — Unit, E2E & CI

> How to run tests, add new tests, and keep the test suite healthy.

---

## Quick Reference

| What | Command |
|------|---------|
| Unit tests (run once) | `npm run test` |
| Unit tests (watch) | `npm run test:watch` |
| Smoke test (unit + build) | `npm run smoke` |
| E2E tests | `npm run test:e2e` |
| E2E with UI | `npm run test:e2e:ui` |

**Production DB slowness / egress:** Use [PERFORMANCE.md](PERFORMANCE.md) (`pg_stat_statements` in Supabase SQL Editor) before changing Postgres settings.

---

## Full local QA (comprehensive)

Use this before a release or when validating auth-heavy flows (e.g. create event, Edge Functions):

1. **`npx eslint .`** — Currently reports warnings only (no errors); safe to treat as informational unless you tighten the config.
2. **`npm run test`** — Full Vitest suite.
3. **`npm run build`** — Production build; catches missing env at compile time where applicable.
4. **`npm run test:e2e`** — Can take **5–15 minutes** on a cold run (Chromium download, dev server boot, network calls to Supabase). Requires a reachable project, **`dev-login`** deployed, and seed users as in [E2E Prerequisites](#e2e-prerequisites).

**Stripe / payments (manual):** Use test keys, Connect test account, and webhook setup as in [PAYMENT_FLOW.md — Stripe sandbox checklist](PAYMENT_FLOW.md#stripe-sandbox-checklist-test-mode). Full paid-ticket acceptance is the [Manual QA playbook](PAYMENT_FLOW.md#manual-qa-playbook-sandbox). Automated E2E for real card flows is optional; document outcomes in release notes when touching checkout or refunds.

**Invalid JWT / env mismatch (`401` on edge functions):**

1. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be the **anon key from the same project** where functions are deployed (ref in `supabase/config.toml` / Dashboard).
2. If you switch projects or rotate keys, **sign out and sign in** — old refresh tokens are tied to the previous project.
3. **CORS** changes do not fix JWT errors; this is always session or wrong keys.
4. See [PAYMENT_FLOW.md — Troubleshooting](PAYMENT_FLOW.md#troubleshooting-401--invalid-jwt).

---

## When to Run What

**Before every push / PR:** Run `npm run smoke`. CI does the same (lint → unit tests → build).

**After pulling/merging:** Run `npm run smoke` to catch breaking changes.

**Before a release or major feature merge:** Run `npm run test:e2e` to validate auth, profile, tickets, dashboard flows. E2E starts the dev server; needs a working backend (Supabase).

**During development:** Use `npm run test:watch` so unit tests re-run on file save.

---

## Adding New Tests

### Unit / component tests (Vitest + RTL)

- **Location:** Colocate with source: `src/utils/foo.ts` → `src/utils/foo.test.ts`
- **Pattern:** `*.test.ts` or `*.test.tsx`; Vitest picks them up from `src/**/*.{test,spec}.{ts,tsx}`.
- **Utils:** Test pure logic, edge cases, error paths.
- **Hooks:** Use `renderHook` + `act`; mock `callEdgeFunction` or other API clients with `vi.mock()`.
- **Components:** Use `render`, `screen`, `userEvent`; wrap with providers (QueryClient, Router, etc.) if needed.

**Example — new util:**

```ts
// src/utils/myUtil.test.ts
import { describe, it, expect } from 'vitest';
import { myUtil } from './myUtil';

describe('myUtil', () => {
  it('returns expected result', () => {
    expect(myUtil('input')).toBe('output');
  });
});
```

**Example — component with providers:**

```tsx
// src/components/MyButton.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MyButton from './MyButton';

describe('MyButton', () => {
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<MyButton onClick={onClick}>Click me</MyButton>);
    await userEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### E2E tests (Playwright)

- **Location:** `tests/e2e/*.spec.ts`
- **Pattern:** One spec per flow (auth, profile, tickets, dashboard, event-detail, checkout).
- **Setup:** Playwright starts `npm run dev` (see `playwright.config.ts` `baseURL` / `webServer`, typically `http://127.0.0.1:4173`).
- **Auth:** `auth.setup.ts` runs first and performs dev login (clicks "Dylan"), then saves `storageState` to `tests/.auth/user.json`. Authenticated specs (profile, dashboard, tickets, event-detail, checkout) use this state. Auth spec runs unauthenticated.
- **Prerequisites:** Supabase project must be running with the `dev-login` edge function. The dev login user IDs (e.g. `1eafb563-071a-45c6-a82e-79b460b3a851` for Dylan) must exist in your Supabase `auth.users` table.

**Example — new E2E spec:**

```ts
// tests/e2e/new-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New flow', () => {
  test('page loads and shows expected content', async ({ page }) => {
    await page.goto('/some-route');
    await expect(page.getByRole('heading', { name: /expected/i })).toBeVisible();
  });
});
```

---

## CI Behaviour

On push/PR to `main`, workflow `.github/workflows/ci.yml`:

1. **Job `ci`:** Lint → unit tests → build (optional secret `VITE_STRIPE_PUBLISHABLE_KEY`).
2. **Job `e2e`:** Runs after `ci` succeeds. Installs Playwright Chromium and runs `npm run test:e2e` **only if** repository secrets **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** are set (same as your local `.env`). Otherwise the step exits 0 with a notice — the job stays green so forks and WIP branches without secrets are not blocked.

**Optional E2E secrets:**

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_PROJECT_ID` | Passed through if set; not strictly required for most flows |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Enables checkout E2E spec (otherwise that spec skips) |

**Prerequisites for E2E in CI:** Hosted (or reachable) Supabase with **`dev-login`** deployed and seed users (e.g. Dylan) in `auth.users`, as in [E2E Prerequisites](#e2e-prerequisites).

---

## Lovable Prompts (Supabase)

Testing itself is not done via Lovable. Lovable is for Supabase: migrations, Edge Function deploys, dashboard config.

Use `docs/LOVABLE_PROMPTS.md` when you need Lovable to:

- Apply migrations
- Deploy Edge Functions
- Configure secrets (e.g. `STRIPE_SECRET_KEY`, `CRON_SECRET`)

---

## Test Coverage

- Vitest can report coverage: add `--coverage` to the test script or run `npx vitest run --coverage`.
- Coverage is not enforced in CI; use it locally to find untested paths.

### Coverage priorities

Add tests in this order when expanding coverage:

| Priority | Area | Items | Rationale |
|----------|------|-------|-----------|
| High | Repositories | ~~connectionsRepository~~, ~~profilesRepository~~, eventManagementRepository, messagingRepository, notificationsRepository, loyaltyRepository, supportRepository, organiserTeamRepository | Core data access; bugs here affect many features |
| High | Hooks | ~~useUnreadMessages~~, useNotificationsQuery, useFriends, useFriendsGoing, usePendingTransfers, usePrivacySettings, useAdminMutations | Used in critical UI flows |
| Medium | Components | ~~EventTile~~, TransferTicketModal, TicketDetailModal, ShareEventSheet, MutualFriendsRow | Reused or payment/transfer-critical |
| Medium | Utils | ~~phone.ts~~, calendarUtils, imageUtils, gamification.ts | Pure logic, easy to test |
| Low | Pages | Most pages (Index, Profile, Tickets, etc.) | Often integration-heavy; E2E covers flows |

### Patterns

- **Repositories:** Mock `@/infrastructure/supabase` with a chain-style mock (`from().select().eq()...then()`). Set `chainRes` per test to control returned data/errors. Mock `@/infrastructure/logger` when needed.
- **Hooks:** Use `renderHook` with `QueryClientProvider` wrapper. Mock `useAuth`, external services (Supabase, API), and `vi.mock()` dependencies. Use `waitFor` for async assertions.
- **Components:** Use `renderWithProviders` from `@/test/test-utils` (includes QueryClient + BrowserRouter with future flags). Prefer `getByRole` over `getByText` for interactive elements. Use flexible matchers for dates (timezone-aware).
- **Utils:** Test pure functions directly; cover edge cases, empty input, and error paths.

### Auth flows (unit-tested)

- **PhoneStep** — phone input, continue, check-phone
- **OtpStep** — OTP input, verify, onBack
- **PasswordStep** — password input, login, onForgotPassword, onBack
- **ForgotPasswordStep** — send OTP, verify, email vs phone reset paths
- **ResetPassword** — recovery hash, loading, form submit, validation

---

## E2E Prerequisites

- **Supabase:** Local or hosted project with `dev-login` edge function deployed.
- **Dev login users:** Ensure these user IDs exist in `auth.users`:
  - Dylan: `1eafb563-071a-45c6-a82e-79b460b3a851`
  - Haan: `e8f02149-2ccf-4324-950a-d2a574c46569`
- **Auth state:** `tests/.auth/user.json` is generated by the setup project and gitignored.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm run test` fails | Run `npm run smoke`; fix failing tests or build errors. |
| E2E times out | Ensure dev server starts (see `playwright.config.ts` `webServer` URL/port); default is `127.0.0.1:4173`. |
| E2E auth setup fails | Ensure Supabase is running and `dev-login` edge function works; verify Dylan user exists. |
| E2E fails in CI | E2E may need Supabase env vars; consider running E2E only on main or manually. |
| `vi.mock` not working | Mock must be hoisted; define it before imports, or use `vi.mock('@/path', () => ({ ... }))` at top of file. |
