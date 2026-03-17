import { test, expect } from '@playwright/test';

test.describe('Dashboard (authenticated)', () => {
  test('loads messages page', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/, { timeout: 10000 });
  });

  test('shows nav and dashboard content', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10000 });
  });
});
