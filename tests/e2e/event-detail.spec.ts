import { test, expect } from '@playwright/test';

test.describe('Event detail (authenticated)', () => {
  const getAccessToken = async (page: any) => {
    return page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!key) return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const data = JSON.parse(raw);
        return data?.access_token ?? data?.currentSession?.access_token ?? null;
      } catch {
        return null;
      }
    });
  };

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
    const cta = page.getByRole('button', { name: /rsvp|purchase|get tickets|checkout/i });
    const hasCta = (await cta.count()) > 0;
    if (hasCta) {
      await expect(cta.first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('smoke: waitlist promotion endpoint responds for host events', async ({ page }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    test.skip(!supabaseUrl || !anonKey, 'Missing Supabase env vars for edge calls');

    await page.goto('/');
    const eventLink = page.locator('a[href^="/events/"]').first();
    await expect(eventLink).toBeVisible({ timeout: 15000 });
    await eventLink.click();
    await expect(page).toHaveURL(/\/events\/[^/]+$/, { timeout: 5000 });

    const editButton = page.getByRole('button', { name: /edit event/i });
    const isHost = await editButton.isVisible().catch(() => false);
    test.skip(!isHost, 'No host event found in seed data');

    const urlParts = page.url().split('/events/');
    const eventId = urlParts[1]?.split('?')[0];
    test.skip(!eventId, 'Event ID not found in URL');

    const accessToken = await getAccessToken(page);
    test.skip(!accessToken, 'No access token found');

    const functionsUrl = `${supabaseUrl}/functions/v1`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    };

    const joinRes = await page.request.post(`${functionsUrl}/waitlist-promote`, {
      headers,
      data: { action: 'join', event_id: eventId },
    });
    expect(joinRes.ok()).toBeTruthy();

    const promoteRes = await page.request.post(`${functionsUrl}/waitlist-promote`, {
      headers,
      data: { action: 'promote', event_id: eventId },
    });
    expect(promoteRes.ok()).toBeTruthy();

    await page.request.post(`${functionsUrl}/waitlist-promote`, {
      headers,
      data: { action: 'leave', event_id: eventId },
    });
  });
});
