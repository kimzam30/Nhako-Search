import type { Page } from '@playwright/test';

/** Shared steps for the UI specs. */

export async function asGuest(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('nhako_guest_mode', 'true');
  });
}

/** Drags across the first unfound word on the board. Returns false when none is left. */
export async function findOneWord(page: Page): Promise<boolean> {
  const r = await page.evaluate(() => {
    const grid = document.querySelector('[role=grid]')!;
    const letters = new Map<string, string>();
    grid.querySelectorAll<HTMLElement>('[data-x][data-y]').forEach(c => letters.set(`${c.dataset.x},${c.dataset.y}`, c.textContent || ''));
    const li = [...document.querySelectorAll<HTMLElement>('ul[aria-label="Words to find"] > li')].find(l => !l.dataset.found);
    if (!li) return null;
    const word = (li.textContent || '').trim();
    const size = Math.sqrt(letters.size);
    const dirs = [[1, 0], [0, 1], [1, 1], [-1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1]];
    const centre = (x: number, y: number) => {
      const b = grid.querySelector(`[data-x="${x}"][data-y="${y}"]`)!.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        for (const [dx, dy] of dirs) {
          let ok = true;
          for (let i = 0; i < word.length && ok; i++) ok = letters.get(`${x + dx * i},${y + dy * i}`) === word[i];
          if (ok) return { a: centre(x, y), b: centre(x + dx * (word.length - 1), y + dy * (word.length - 1)) };
        }
    return null;
  });
  if (!r) return false;
  await page.mouse.move(r.a.x, r.a.y);
  await page.mouse.down();
  await page.mouse.move(r.b.x, r.b.y, { steps: 8 });
  await page.mouse.up();
  return true;
}
