import { test, expect, type Page } from '@playwright/test';
import { asGuest } from './helpers';

/**
 * Polish regressions from the round-2 UI/UX audit (issue.md U11-U17): one
 * guest avatar, no butterflies behind text, the footer clear of the Home tab,
 * 44px tap targets, the daily card's week strip, a full-size desktop board,
 * and a room code field that explains the letters it drops.
 */

/** True when a tap just above the element's top edge still lands on it (44px hit area). */
async function tallEnoughToTap(page: Page, selector: string) {
  // Entrances move things; wait for every finite animation to settle.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => null)))
  );
  return page.evaluate(sel => {
    const el = document.querySelector<HTMLElement>(sel)!;
    const r = el.getBoundingClientRect();
    const need = Math.max(0, (44 - r.height) / 2);
    const x = r.left + r.width / 2;
    const above = document.elementFromPoint(x, r.top - need + 0.5);
    const below = document.elementFromPoint(x, r.bottom + need - 0.5);
    return !!above && !!below && el.contains(above) && el.contains(below);
  }, selector);
}

test.describe('On a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a guest has the same butterfly avatar on Home and Profile', async ({ page }) => {
    await asGuest(page);
    await page.goto('/profile');
    const avatar = page.locator('header span.rounded-full').first();
    await expect(avatar.locator('svg')).toHaveCount(1);
    await expect(avatar).toHaveText('');
  });

  test('the butterfly sky steps aside on a page of text', async ({ page }) => {
    await asGuest(page);
    await page.goto('/how-to-play');
    await expect.poll(() => page.evaluate(() => document.querySelector<HTMLElement>('.sky')?.style.opacity)).toBe('0');
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => document.querySelector<HTMLElement>('.sky')?.style.opacity)).toBe('');
  });

  test('the signature footer clears the raised Home tab', async ({ page }) => {
    await asGuest(page);
    await page.goto('/play/race/lobby');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const sig = (await page.getByText('a little garden, made by kimzam').boundingBox())!;
    const home = (await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).locator('span').first().boundingBox())!;
    expect(sig.y + sig.height).toBeLessThanOrEqual(home.y);
  });

  test('small chips still take a 44px tap', async ({ page }) => {
    await asGuest(page);
    await page.goto('/');
    expect(await tallEnoughToTap(page, 'a[href="/level-path"].press')).toBe(true);
    await page.goto('/how-to-play');
    expect(await tallEnoughToTap(page, 'nav[aria-label="On this page"] a')).toBe(true);
    await page.goto('/settings');
    expect(await tallEnoughToTap(page, '[aria-label="Lofi track"] button')).toBe(true);
  });

  test('the daily card shows the last seven days', async ({ page }) => {
    await asGuest(page);
    await page.goto('/');
    const card = page.getByRole('navigation', { name: 'Game modes' }).locator('a[href="/daily"]');
    await expect(card.locator('span.w-6.h-6')).toHaveCount(7);
  });

  test('a dropped room code letter explains itself', async ({ page }) => {
    await asGuest(page);
    await page.goto('/play/race/lobby');
    const field = page.getByRole('textbox', { name: 'Room code' });
    await field.pressSequentially('AB');
    await expect(field).toHaveValue('A');
    await expect(page.getByText('Codes never use B, I, O, S, 0, 1 or 5')).toBeVisible();
  });
});

test('a desktop board uses the height beside the word list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await asGuest(page);
  await page.goto('/play/standard/garden/hard');
  const grid = page.getByRole('grid');
  await grid.waitFor();
  expect((await grid.boundingBox())!.width).toBeGreaterThanOrEqual(660);
  await expect(page.getByRole('button', { name: /hint/i })).toBeInViewport({ ratio: 1 });
  await expect(grid).toBeInViewport({ ratio: 1 });
});
