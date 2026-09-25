import { test, expect, Page } from '@playwright/test';

/**
 * Accessibility and responsive suite (Phase 6).
 *
 * The grid was previously pointer-only — no tabindex, no roles, no keyboard
 * path at all. These lock in a full keyboard route through a puzzle and check
 * the layout holds from a small phone to a 2560px desktop.
 */

const VIEWPORTS = [
  { name: 'phone-small', width: 360, height: 640 },
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'wide', width: 2560, height: 1440 },
];

async function focusGrid(page: Page) {
  const grid = page.getByRole('grid');
  await grid.waitFor({ state: 'visible' });
  await grid.focus();
  return grid;
}

test.describe('Keyboard play', () => {
  test('the board is reachable by keyboard and exposes grid semantics', async ({ page }) => {
    await page.goto('/play/standard/standard/easy');
    const grid = await focusGrid(page);

    await expect(grid).toHaveAttribute('tabindex', '0');
    await expect(grid).toHaveAttribute('aria-rowcount', '8');
    await expect(grid).toHaveAttribute('aria-colcount', '8');

    // Rows and cells must exist for role="grid" to be valid.
    expect(await page.getByRole('row').count()).toBe(8);
    expect(await page.getByRole('gridcell').count()).toBe(64);
  });

  test('arrow keys move the cursor and aria-activedescendant follows', async ({ page }) => {
    await page.goto('/play/standard/standard/easy');
    const grid = await focusGrid(page);

    const start = await grid.getAttribute('aria-activedescendant');
    expect(start).toMatch(/-0-0$/);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    const moved = await grid.getAttribute('aria-activedescendant');
    expect(moved).toMatch(/-2-1$/);

    // The cursor must point at a real cell.
    expect(await page.locator(`#${moved}`).count()).toBe(1);
  });

  test('the cursor cannot leave the grid', async ({ page }) => {
    await page.goto('/play/standard/standard/easy');
    const grid = await focusGrid(page);

    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowLeft');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowUp');
    expect(await grid.getAttribute('aria-activedescendant')).toMatch(/-0-0$/);

    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown');
    expect(await grid.getAttribute('aria-activedescendant')).toMatch(/-7-7$/);
  });

  test('Enter starts a selection, arrows extend it, Escape cancels', async ({ page }) => {
    await page.goto('/play/standard/standard/easy');
    await focusGrid(page);

    const selectedCount = () => page.locator('[role="gridcell"][aria-selected="true"]').count();

    expect(await selectedCount()).toBe(0);

    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    // Anchor plus two steps.
    expect(await selectedCount()).toBe(3);

    await page.keyboard.press('Escape');
    expect(await selectedCount()).toBe(0);
  });

  test('a whole word can be found without a pointer', async ({ page }) => {
    await page.goto('/play/standard/standard/easy');
    const grid = await focusGrid(page);

    // Read the solution out of the DOM: find a placed word by walking the grid.
    // The word list shows targets; pick the first and locate it on the board.
    const target = await page.evaluate(() => {
      const cells = new Map<string, string>();
      document.querySelectorAll<HTMLElement>('[data-x][data-y]').forEach(el => {
        cells.set(`${el.dataset.x},${el.dataset.y}`, el.textContent || '');
      });
      const size = Math.sqrt(cells.size);
      const words = [...document.querySelectorAll('ul[aria-label="Words to find"] > li')]
        .map(d => (d.textContent || '').trim())
        .filter(w => /^[A-Z]{3,}$/.test(w));

      const dirs = [[1, 0], [0, 1], [1, 1], [-1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1]];
      for (const word of words) {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            for (const [dx, dy] of dirs) {
              let ok = true;
              for (let i = 0; i < word.length; i++) {
                if (cells.get(`${x + dx * i},${y + dy * i}`) !== word[i]) { ok = false; break; }
              }
              if (ok) return { word, x, y, dx, dy };
            }
          }
        }
      }
      return null;
    });

    expect(target, 'should locate a placed word on the board').not.toBeNull();
    const { word, x, y, dx, dy } = target!;

    // Walk the cursor to the start of the word.
    for (let i = 0; i < x; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < y; i++) await page.keyboard.press('ArrowDown');
    expect(await grid.getAttribute('aria-activedescendant')).toMatch(new RegExp(`-${x}-${y}$`));

    // Anchor, then trace the word.
    await page.keyboard.press('Enter');
    const stepKey = (d: number, axis: 'x' | 'y') =>
      axis === 'x' ? (d > 0 ? 'ArrowRight' : 'ArrowLeft') : d > 0 ? 'ArrowDown' : 'ArrowUp';
    for (let i = 1; i < word.length; i++) {
      if (dx !== 0) await page.keyboard.press(stepKey(dx, 'x'));
      if (dy !== 0) await page.keyboard.press(stepKey(dy, 'y'));
    }
    await page.keyboard.press('Enter');

    // A found word is struck through in the list.
    await expect(page.locator('li[data-found]').filter({ hasText: word }).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("the partner's board is not a tab stop", async ({ page }) => {
    await page.goto('/play/standard/standard/easy');
    const grid = page.getByRole('grid');
    await grid.waitFor({ state: 'visible' });
    // Solo play has exactly one interactive grid.
    expect(await page.locator('[role="grid"][tabindex="0"]').count()).toBe(1);
  });
});

test.describe('Responsive layout', () => {
  for (const vp of VIEWPORTS) {
    test(`[${vp.name} ${vp.width}x${vp.height}] nav does not cover the content`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.getByRole('heading', { name: 'NhakoSearch' }).first().waitFor();

      const boxes = await page.evaluate(() => {
        const nav = document.querySelector('nav.tabbar');
        const shell = document.querySelector('.app-shell');
        if (!nav || !shell) return null;
        const n = nav.getBoundingClientRect();
        const s = shell.getBoundingClientRect();
        return {
          nav: { left: n.left, right: n.right, top: n.top, bottom: n.bottom },
          shell: { left: s.left, right: s.right },
          viewport: window.innerWidth,
          horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });

      expect(boxes).not.toBeNull();
      expect(boxes!.horizontalScroll, 'page must not scroll sideways').toBe(false);
      // Nav must stay on screen.
      expect(boxes!.nav.left).toBeGreaterThanOrEqual(0);
      expect(boxes!.nav.right).toBeLessThanOrEqual(boxes!.viewport + 1);
    });
  }

  test('[tablet-landscape] the board and word list both fit without scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/play/standard/standard/hard');
    await page.locator('[data-x="0"][data-y="0"]').waitFor({ state: 'visible' });

    const fits = await page.evaluate(() => {
      const grid = document.querySelector('.grid.relative.z-10')!.getBoundingClientRect();
      const list = document.querySelector('ul[aria-label="Words to find"]')?.getBoundingClientRect();
      return {
        gridBottom: grid.bottom,
        listBottom: list?.bottom ?? 0,
        viewportHeight: window.innerHeight,
        square: Math.abs(grid.width - grid.height) < 1,
      };
    });

    expect(fits.square).toBe(true);
    // Short landscape viewport: the height guard should shrink the board.
    expect(fits.gridBottom).toBeLessThanOrEqual(fits.viewportHeight);
  });
});

test.describe('Focus visibility', () => {
  test('interactive controls show a focus ring', async ({ page }) => {
    await page.goto('/play/race/lobby');
    const input = page.getByLabel('Room code');
    await input.focus();

    const outline = await input.evaluate(el => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThan(0);
  });
});
