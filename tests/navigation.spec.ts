import { test, expect, type Page } from '@playwright/test';
import { asGuest, findOneWord } from './helpers';

/**
 * Navigation and layout regressions from the round-2 UI/UX audit (issue.md
 * U1, U3, U4): Back mid-puzzle asks first, the free-play difficulty is
 * visible without scrolling, and a phone in landscape gets a playable board.
 */

async function startEasyBoard(page: Page) {
  await page.goto('/play/standard');
  await page.getByRole('radio', { name: /Easy/ }).click();
  await page.getByRole('link', { name: 'Play', exact: true }).click();
  await page.waitForURL(/\/play\/standard\/.+/);
  await page.locator('[data-x="0"][data-y="0"]').waitFor();
}

test.describe('Back during a puzzle', () => {
  test('with nothing found, Back just leaves', async ({ page }) => {
    await asGuest(page);
    await startEasyBoard(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/play\/standard$/);
  });

  test('after a find, Back asks first and Keep playing keeps the board', async ({ page }) => {
    await asGuest(page);
    await startEasyBoard(page);
    const url = page.url();
    expect(await findOneWord(page)).toBe(true);
    await expect(page.locator('li[data-found]')).toHaveCount(1);

    await page.goBack();
    await expect(page.getByRole('dialog', { name: 'Leave this game?' })).toBeVisible();
    expect(page.url()).toBe(url);

    await page.getByRole('button', { name: 'Keep playing' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('li[data-found]')).toHaveCount(1);

    // Still guarded, and Leave goes back to setup in one step.
    await page.goBack();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page).toHaveURL(/\/play\/standard$/);
  });

  test('once the board is won, one Back leaves', async ({ page }) => {
    await asGuest(page);
    await startEasyBoard(page);
    for (let i = 0; i < 12 && (await findOneWord(page)); i++) await page.waitForTimeout(250);
    await expect(page.getByText('Puzzle complete!')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/play\/standard$/);
  });
});

test('free play shows the difficulty without scrolling on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 659 });
  await asGuest(page);
  await page.goto('/play/standard');
  for (const name of [/Easy/, /Medium/, /Hard/]) await expect(page.getByRole('radio', { name })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('link', { name: 'Play', exact: true })).toBeInViewport({ ratio: 1 });
});

test.describe('Phone in landscape', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('the tab bar becomes a side rail', async ({ page }) => {
    await asGuest(page);
    await page.goto('/');
    const nav = (await page.getByRole('navigation', { name: 'Main' }).boundingBox())!;
    expect(nav.x).toBe(0);
    expect(nav.height).toBe(390);
    for (const tab of await page.getByRole('navigation', { name: 'Main' }).getByRole('link').all()) await expect(tab).toBeInViewport({ ratio: 1 });
  });

  test('a hard board fits with the hint in reach and no scrolling', async ({ page }) => {
    await asGuest(page);
    await page.goto('/play/standard/garden/hard');
    await page.locator('[data-x="0"][data-y="0"]').waitFor();
    const cell = (await page.locator('[data-x="0"][data-y="0"]').boundingBox())!;
    expect(cell.width).toBeGreaterThanOrEqual(20);
    await expect(page.getByRole('button', { name: /hint/i })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('timer')).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(390);
  });
});

test('Back mid-race asks before forfeiting', async ({ browser }) => {
  const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXYZ2346789';
  const roomCode = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  const open = async (name: string, leader: boolean) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto('/');
    await page.evaluate(
      ({ name, roomCode, leader }) => {
        localStorage.setItem('nhako_guest_mode', 'true');
        localStorage.setItem('nhako_guest_name', name);
        if (leader) sessionStorage.setItem('is_leader_' + roomCode, 'true');
      },
      { name, roomCode, leader }
    );
    await page.goto('/play/race/lobby');
    await page.goto(`/play/race/${roomCode}`);
    return page;
  };
  const leader = await open('Leader', true);
  const guest = await open('Partner', false);
  await guest.getByRole('button', { name: 'Ready Up' }).click({ timeout: 15000 });
  const start = leader.getByRole('button', { name: 'Start Race' });
  await expect(start).toBeEnabled({ timeout: 10000 });
  await start.click();
  // The partner's mini board is in the DOM too; the first grid is your own.
  const myCell = guest.locator('[data-x="0"][data-y="0"]').first();
  await myCell.waitFor({ timeout: 15000 });

  await guest.goBack();
  await expect(guest.getByRole('dialog', { name: 'Leave this game?' })).toBeVisible();
  await expect(guest).toHaveURL(new RegExp(`/play/race/${roomCode}$`));
  await guest.getByRole('button', { name: 'Keep playing' }).click();
  await expect(myCell).toBeVisible();

  await leader.context().close();
  await guest.context().close();
});
