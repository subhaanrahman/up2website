import { test, expect } from '@playwright/test';

test.describe('Profile page (authenticated)', () => {
  test('loads profile page', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/, { timeout: 10000 });
  });

  test('shows profile content or edit link', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('link', { name: /^edit$/i })).toBeVisible({ timeout: 10000 });
  });

  test('navigates to profile edit', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('link', { name: /^edit$/i }).first().click();
    await expect(page).toHaveURL(/\/profile\/edit/, { timeout: 5000 });
  });
});
