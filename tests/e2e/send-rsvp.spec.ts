import { test, expect } from '@playwright/test';

/**
 * Smoke: authenticated user can open host Send RSVP screen for a seeded event.
 * Search/invite calls require Edge deploy + manage rights; this only checks UI shell.
 */
test.describe('Send RSVP (authenticated)', () => {
  test('loads Send RSVP page with search field', async ({ page }) => {
    await page.goto('/');
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 15_000 });
    const href = await eventLink.getAttribute('href');
    const eventId = href?.match(/\/events\/([^/?]+)/)?.[1];
    test.skip(!eventId, 'No event link on home feed');

    await page.goto(`/events/${eventId}/send-rsvp`);
    await expect(page.getByRole('heading', { name: /send rsvp/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/search username/i)).toBeVisible();
    await expect(page.getByText(/type at least 2 characters/i)).toBeVisible();
  });
});
