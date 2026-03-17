import { test, expect } from '@playwright/test';

test.describe('Tickets page (authenticated)', () => {
  test('loads events/tickets page', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/, { timeout: 10000 });
  });

  test('shows tabs or ticket content', async ({ page }) => {
    await page.goto('/events');
    await expect(
      page.getByRole('tab', { name: /my plans|my events/i }).or(page.getByText(/TICKETS/i))
    ).toBeVisible({ timeout: 10000 });
  });
});
