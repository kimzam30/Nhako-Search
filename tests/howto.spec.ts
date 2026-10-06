import { test, expect } from '@playwright/test';

/*
 * How to Play is server-rendered: its content must be in the HTML itself
 * (no script needed), so crawlers and slow phones both get the rules.
 */
test('how to play is in the server HTML', async ({ request }) => {
  const res = await request.get('/how-to-play');
  expect(res.ok()).toBe(true);
  const html = await res.text();
  for (const text of ['Which way words run', 'Play with a friend', 'Install it like an app', 'Add to Home Screen']) {
    expect(html).toContain(text);
  }
  expect(html).toContain('<title>How to play');
});

test('home and profile link to how to play', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'How to play' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'How to play' })).toBeVisible();
  await page.goto('/profile');
  await expect(page.getByRole('link', { name: /How to play/ })).toBeVisible();
});

test('the direction guide matches the generator', async ({ page }) => {
  await page.goto('/how-to-play#directions');
  // Easy 2 directions, medium 4, hard all 8: 14 lit arrows in total.
  await expect(page.locator('#directions [class*="dirOn"]')).toHaveCount(14);
});
