import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/.auth/user.json';

setup('authenticate via dev login', async ({ page }) => {
  await page.goto('/auth');

  // Click Dylan dev login button
  await page.getByRole('button', { name: 'Dylan' }).click();

  // Wait for redirect to profile after successful login
  await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });

  // Save storage state for authenticated tests
  await page.context().storageState({ path: authFile });
});
