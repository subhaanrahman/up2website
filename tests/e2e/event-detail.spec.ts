import { test, expect } from '@playwright/test';

test.describe('Event detail (authenticated)', () => {
  test('loads event detail when navigating from home', async ({ page }) => {
    await page.goto('/');
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 15000 });
    await eventLink.click();
    await expect(page).toHaveURL(/\/events\/[^/]+$/, { timeout: 5000 });
  });

  test('shows event content or CTA on detail page', async ({ page }) => {
    await page.goto('/');
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 15000 });
    await eventLink.click();
    await expect(page).toHaveURL(/\/events\/[^/]+$/, { timeout: 5000 });
    await expect(
      page.getByRole('button', { name: /rsvp|purchase|get tickets|checkout/i }).or(
        page.getByRole('heading', { level: 1 })
      )
    ).toBeVisible({ timeout: 10000 });
  });
});
