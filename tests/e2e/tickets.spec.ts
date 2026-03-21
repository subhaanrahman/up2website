import { test, expect } from '@playwright/test';

test.describe('Tickets page (authenticated)', () => {
  test('loads events/tickets page', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/, { timeout: 10000 });
  });

  test('shows tabs or ticket content', async ({ page }) => {
    await page.goto('/events');
    const tabs = page.getByRole('tab', { name: /my plans|my events/i });
    const hasTabs = (await tabs.count()) > 0;
    if (hasTabs) {
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    } else {
      const heading = page.getByRole('heading', { name: /tickets|my tickets/i }).first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  });
});
