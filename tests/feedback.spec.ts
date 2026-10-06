import { test, expect } from '@playwright/test';
import { asGuest, findOneWord } from './helpers';

/**
 * Feedback and first-run regressions from the round-2 UI/UX audit (issue.md
 * U5-U10): locked levels answer a tap, the first board shows how to drag,
 * Home fits a short phone, new butterflies land on the win sheet, and every
 * button that starts a puzzle says Play.
 */

test('tapping a locked level explains how to unlock it', async ({ page }) => {
  await asGuest(page);
  await page.goto('/level-path');
  const locked = page.getByRole('button', { name: 'Level 2, locked' }).first();
  // aria-disabled (it cannot be played), but a real tap still lands.
  await locked.click({ force: true });
  await expect(page.getByText('Level 2 is locked')).toBeVisible();
  await expect(page.getByText(/Finish Garden 1 to open the path/)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the first board shows a drag guide until the first find', async ({ page }) => {
  await asGuest(page);
  await page.goto('/play/standard/garden/easy');
  await page.locator('[data-x="0"][data-y="0"]').waitFor();
  const caption = page.getByText('Drag from the first letter to the last');
  await expect(caption).toBeVisible({ timeout: 4000 });

  expect(await findOneWord(page)).toBe(true);
  await expect(caption).toHaveCount(0);

  // A word was found, so the next board starts without it.
  await page.reload();
  await page.locator('[data-x="0"][data-y="0"]').waitFor();
  await page.waitForTimeout(2000);
  await expect(caption).toHaveCount(0);
});

for (const [w, h] of [
  [393, 659],
  [360, 640],
]) {
  test(`home fits a ${w}x${h} phone with every mode visible`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await asGuest(page);
    await page.goto('/');
    const tabTop = (await page.locator('nav.tabbar').boundingBox())!.y;
    for (const tile of await page.getByRole('navigation', { name: 'Game modes' }).getByRole('link').all()) {
      const b = (await tile.boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(tabTop);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(h);
  });
}

test('a butterfly caught by a win is shown on the win sheet, not as a toast', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 659 });
  await asGuest(page);
  await page.goto('/play/standard/garden/easy');
  await page.locator('[data-x="0"][data-y="0"]').waitFor();
  // Catches in the first seconds after a load are stored quietly (see
  // MergeClient), so play at a human pace.
  await page.waitForTimeout(6500);
  for (let i = 0; i < 12 && (await findOneWord(page)); i++) await page.waitForTimeout(200);

  const sheet = page.getByRole('dialog', { name: 'Puzzle complete!' });
  await expect(sheet.getByText(/new butterfl/i).first()).toBeVisible({ timeout: 10_000 });
  // The whole sheet, ribbon included, still fits the screen.
  expect((await sheet.boundingBox())!.y).toBeGreaterThanOrEqual(28);
  await expect(page.locator('ol[aria-live] li')).toHaveCount(0);
});

test('every button that starts a puzzle says Play', async ({ page }) => {
  await asGuest(page);
  await page.goto('/daily');
  await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
  await page.goto('/play/standard');
  await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeVisible();
  await page.goto('/level-path');
  await page.getByRole('button', { name: /^Level 1\b/ }).first().click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Play', exact: true })).toBeVisible();
});
