import { test, expect } from '@playwright/test';

const mockGifSearchBody = {
  results: [
    {
      id: 'e2e-gif-1',
      preview_url: 'https://media.giphy.com/e2e-preview.gif',
      gif_url: 'https://media.giphy.com/e2e-full.gif',
    },
  ],
  next_offset: null,
  configured: true,
};

/**
 * GIF picker smoke: home feed composer + mocked Edge `gif-search` (no live GIPHY key in CI).
 */
test.describe('GIF picker (authenticated)', () => {
  test('opens picker and shows mocked grid and attribution', async ({ page }) => {
    await page.route('**/functions/v1/gif-search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGifSearchBody),
      });
    });

    await page.goto('/');
    await expect(page.getByText('Write Something...')).toBeVisible({ timeout: 15_000 });
    await page.getByText('Write Something...').click();

    await page.getByRole('button', { name: /add gif/i }).click();

    await expect(page.getByPlaceholder('Search GIPHY')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /powered by giphy/i })).toHaveAttribute('href', 'https://giphy.com');

    const preview = page.locator('img[src="https://media.giphy.com/e2e-preview.gif"]');
    await expect(preview).toBeVisible({ timeout: 10_000 });
  });
});
