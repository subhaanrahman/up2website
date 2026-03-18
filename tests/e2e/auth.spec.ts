import { test, expect } from '@playwright/test';

test.describe('Auth page (unauthenticated)', () => {
  test('loads and shows auth UI', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByRole('img', { name: 'Up2' })).toBeVisible();
    await expect(page.getByRole('button', { name: /skip for now/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
  });

  test('has phone step with continue flow', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByPlaceholder(/phone|mobile|number/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('shows dev login buttons', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByRole('button', { name: 'Dylan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Haan' })).toBeVisible();
  });

  test('reset-password without hash redirects to auth', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(page.getByText(/loading|verifying/i).first()).toBeVisible({ timeout: 2000 });
    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
  });
});
