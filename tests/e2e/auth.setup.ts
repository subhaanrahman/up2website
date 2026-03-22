import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/.auth/user.json';

setup('authenticate via dev login', async ({ page }) => {
  await page.goto('/auth');

  // Wait for dev-login edge response (React async handler; click() alone can resolve before fetch completes)
  const [devLoginResponse] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/functions/v1/dev-login') &&
        res.request().method() === 'POST',
      { timeout: 30_000 },
    ),
    page.getByRole('button', { name: 'Dylan' }).click(),
  ]);
  if (!devLoginResponse.ok()) {
    throw new Error(
      `dev-login failed: HTTP ${devLoginResponse.status()}. Check Edge deploy, SEED_USER_PASSWORD, and seed users (see docs/supabase/AUTH_AND_SEEDING.md).`,
    );
  }

  // Wait for redirect to profile after successful login
  await expect(page).toHaveURL(/\/profile/, { timeout: 15_000 });

  // Save storage state for authenticated tests
  await page.context().storageState({ path: authFile });
});
