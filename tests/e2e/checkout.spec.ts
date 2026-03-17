import { test, expect } from '@playwright/test';

const hasStripe = !!(
  process.env.VITE_STRIPE_PUBLISHABLE_KEY &&
  process.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'pk_test_placeholder'
);

test.describe('Checkout flow (authenticated, optional)', () => {
  test.skip(!hasStripe, 'Skip checkout when Stripe is not configured');

  test('event with tickets shows purchase or Stripe message', async ({ page }) => {
    await page.goto('/');
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 15000 });
    await eventLink.click();
    await expect(page).toHaveURL(/\/events\/[^/]+$/, { timeout: 5000 });
    const purchaseBtn = page.getByRole('button', { name: /get tickets|purchase|checkout/i });
    if (await purchaseBtn.isVisible()) {
      await purchaseBtn.click();
      await expect(
        page.getByText(/stripe|reserving|checkout/i).or(page.locator('[data-stripe]'))
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
