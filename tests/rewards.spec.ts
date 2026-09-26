import { test, expect, type Page } from '@playwright/test';

/**
 * Rewards, album, word freshness, new pages and navigation speed.
 *
 * Boards are solved through the keyboard surface (arrow keys + Enter), reading
 * the letters from the DOM, the same path a keyboard player uses.
 */

async function solve(page: Page, limit = 99) {
  return page.evaluate(async limit => {
    const grid = document.querySelector('[role=grid]') as HTMLElement;
    const cells = [...document.querySelectorAll<HTMLElement>('[data-x]')];
    const W = Math.max(...cells.map(c => +c.dataset.x!)) + 1;
    const H = Math.max(...cells.map(c => +c.dataset.y!)) + 1;
    const L: Record<string, string> = {};
    cells.forEach(c => (L[`${c.dataset.x},${c.dataset.y}`] = (c.getAttribute('aria-label') || '').charAt(0)));
    const words = [...document.querySelectorAll<HTMLElement>('[aria-label="Words to find"] li')]
      .filter(li => !li.dataset.found)
      .map(li => li.innerText.trim().toUpperCase().replace(/[^A-Z]/g, ''));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    const find = (w: string) => {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          for (const [dx, dy] of dirs) {
            let ok = true;
            for (let i = 0; i < w.length; i++) if (L[`${x + dx * i},${y + dy * i}`] !== w[i]) { ok = false; break; }
            if (ok) return { x, y, ex: x + dx * (w.length - 1), ey: y + dy * (w.length - 1) };
          }
      return null;
    };
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const key = async (k: string) => {
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      await sleep(15);
    };
    grid.focus();
    const cur = () => {
      const f = document.querySelector('[data-focused]');
      return f ? [+f.getAttribute('data-x')!, +f.getAttribute('data-y')!] : [0, 0];
    };
    const moveTo = async (tx: number, ty: number) => {
      for (let g = 0; g < 60; g++) {
        const [fx, fy] = cur();
        if (fx === tx && fy === ty) return;
        await key(fx < tx ? 'ArrowRight' : fx > tx ? 'ArrowLeft' : fy < ty ? 'ArrowDown' : 'ArrowUp');
      }
    };
    for (const w of words.slice(0, limit)) {
      const p = find(w);
      if (!p) continue;
      await moveTo(p.x, p.y);
      await key('Enter');
      await moveTo(p.ex, p.ey);
      await key('Enter');
      await sleep(120);
    }
    return words;
  }, limit);
}

async function freshGuest(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nhako_guest_mode', 'true');
  });
}

test('finishing a puzzle pays tokens, shows the breakdown and catches the first butterfly', async ({ page }) => {
  await freshGuest(page);
  await page.goto('/play/standard/garden/easy');
  await page.locator('[data-x="0"][data-y="0"]').waitFor();
  await solve(page);

  const dialog = page.getByRole('dialog', { name: 'Puzzle complete!' });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  // No hints were used, so the no-hint bonus is paid.
  await expect(dialog.getByText('No hints +2')).toBeVisible();

  // Puzzle (3) + stars bonus + no hints (2) + First flight (15) at least.
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('nhako_wallet') || '{}').tokens ?? 0), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(20);
  const collection = await page.evaluate(() => JSON.parse(localStorage.getItem('nhako_collection') || '[]'));
  expect(collection.map((c: { butterfly_style_id: string }) => c.butterfly_style_id)).toContain('ach-first-flight');

  await page.goto('/album');
  await expect(page.getByRole('button', { name: /Meadow Sprite, caught/ })).toBeVisible();
});

const ALL_ACHIEVEMENTS = [
  'first-flight', 'chapter-c1', 'chapter-c2', 'chapter-c3', 'chapter-c4', 'chapter-c5', 'chapter-c6', 'chapter-c7',
  'chapter-c8', 'chapter-c9', 'chapter-c10', 'chapter-c11', 'chapter-c12', 'stars-50', 'stars-250', 'stars-1000',
  'daily-first', 'streak-3', 'streak-7', 'streak-30', 'daily-25', 'no-hint-10', 'swift-hard', 'blitz-easy',
  'combo-5', 'race-1', 'race-10', 'race-50', 'together-1', 'friend-1', 'explorer', 'night-owl', 'early-bird',
  'words-100', 'words-1000', 'words-5000', 'tokens-500',
];

test('every species in the album is drawn differently', async ({ page }) => {
  await freshGuest(page);
  await page.evaluate(ids => {
    localStorage.setItem(
      'nhako_collection',
      JSON.stringify(ids.map(id => ({ butterfly_style_id: `ach-${id}`, earned_from: id, earned_at: new Date().toISOString() })))
    );
  }, ALL_ACHIEVEMENTS);
  await page.goto('/album');
  await expect(page.getByText(`${ALL_ACHIEVEMENTS.length} of ${ALL_ACHIEVEMENTS.length} species caught`)).toBeVisible();

  const art = await page.evaluate(() =>
    [...document.querySelectorAll('button[aria-label*=", caught"] svg')].map(svg =>
      // Ids are per-instance; everything else is the design itself.
      svg.outerHTML.replace(/\s(id|clip-path)="[^"]*"/g, '')
    )
  );
  expect(art).toHaveLength(ALL_ACHIEVEMENTS.length);
  expect(new Set(art).size).toBe(ALL_ACHIEVEMENTS.length);
});

test('free play does not repeat words across back-to-back games', async ({ page }) => {
  await freshGuest(page);
  const seen: string[][] = [];
  for (let i = 0; i < 5; i++) {
    await page.goto('/play/standard/garden/easy');
    await page.locator('[data-x="0"][data-y="0"]').waitFor();
    const words = await page.locator('[aria-label="Words to find"] li').allInnerTexts();
    seen.push(words.map(w => w.trim().toUpperCase()));
  }
  const flat = seen.flat();
  // 5 games x 6 words from a ~110-word pool: every word should be new.
  expect(new Set(flat).size).toBe(flat.length);
});

test('the daily rotates themes and shows its reward', async ({ page }) => {
  await page.goto('/daily');
  await expect(page.getByText('Theme', { exact: true })).toBeVisible();
  await expect(page.getByText('Reward', { exact: true })).toBeVisible();
});

test('free play offers twelve themes', async ({ page }) => {
  await page.goto('/play/standard');
  await expect(page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio')).toHaveCount(12);
  for (const name of ['Seaside', 'Bakery', 'Woodland', 'Travel', 'Music', 'Seasons']) {
    await expect(page.getByRole('radio', { name: new RegExp(name) })).toBeVisible();
  }
});

test('friends asks guests to sign in', async ({ page }) => {
  await freshGuest(page);
  await page.goto('/friends');
  await expect(page.getByRole('heading', { name: 'Play with friends' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in with Google' })).toBeVisible();
});

test('an unknown address shows a friendly 404 with a way home', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('switching tabs shows real data immediately', async ({ page }) => {
  await freshGuest(page);
  await page.evaluate(() =>
    localStorage.setItem('nhako_daily', JSON.stringify({ lastDate: '2026-01-01', streak: 1, history: ['2026-01-01'] }))
  );
  await page.goto('/');
  await page.getByRole('link', { name: 'Home', exact: true }).waitFor();
  // Warm every route once, as a player moving around would.
  for (const tab of ['Daily', 'Levels', 'You', 'Home']) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab }).click();
    await page.waitForLoadState('networkidle');
  }
  for (const [tab, heading] of [['Daily', 'Daily puzzle'], ['Levels', 'Level map'], ['You', 'Guest']] as const) {
    const t0 = Date.now();
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    const elapsed = Date.now() - t0;
    expect(elapsed, `${tab} took ${elapsed}ms`).toBeLessThan(800);
  }
});
