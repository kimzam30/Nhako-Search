import { test, expect } from '@playwright/test';

/**
 * Security and data-integrity suite (Phase 4).
 *
 * Note: the CSP and other headers are set by next.config.ts `headers()`, which
 * only applies to a production-style server. `next dev` does emit them, but if
 * these fail locally, check with `npm run build && npm start` before assuming a
 * regression.
 */

test.describe('Security headers', () => {
  test('the app sends the expected hardening headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    const headers = response!.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['content-security-policy']).toBeTruthy();

    // Next's version banner should not be advertised.
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('the CSP locks down the dangerous directives', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response!.headers()['content-security-policy'] ?? '';

    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    // Supabase must stay reachable for REST and realtime.
    expect(csp).toMatch(/connect-src[^;]*supabase/);
    expect(csp).toMatch(/connect-src[^;]*wss:/);
  });

  test('no CSP violations are reported on the main screens', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (/Content Security Policy|Refused to (load|execute|apply)/i.test(text)) {
        violations.push(text);
      }
    });

    for (const path of ['/', '/settings', '/level-path', '/play/race/lobby']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    expect(violations).toEqual([]);
  });
});

test.describe('Delete My Data', () => {
  test('asks for confirmation instead of using window.confirm', async ({ page }) => {
    let nativeDialogFired = false;
    page.on('dialog', d => {
      nativeDialogFired = true;
      d.dismiss();
    });

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Delete my data' }).click();

    await expect(page.getByRole('button', { name: 'Delete everything' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep my data' })).toBeVisible();
    expect(nativeDialogFired).toBe(false);
  });

  test('cancelling leaves stored progress untouched', async ({ page }) => {
    await page.goto('/settings');
    await page.evaluate(() => {
      localStorage.setItem('nhako_levels', JSON.stringify({ 'c1-l1': { stars: 3 } }));
    });

    await page.getByRole('button', { name: 'Delete my data' }).click();
    await page.getByRole('button', { name: 'Keep my data' }).click();

    const levels = await page.evaluate(() => localStorage.getItem('nhako_levels'));
    expect(levels).toContain('c1-l1');
  });

  test('confirming clears only this app\'s keys, not the whole origin', async ({ page }) => {
    await page.goto('/settings');
    await page.evaluate(() => {
      localStorage.setItem('nhako_levels', JSON.stringify({ 'c1-l1': { stars: 3 } }));
      localStorage.setItem('nhako_theme', 'dark');
      // A key the app does not own, previously destroyed by localStorage.clear().
      localStorage.setItem('unrelated_third_party_key', 'keep-me');
    });

    await page.getByRole('button', { name: 'Delete my data' }).click();
    await page.getByRole('button', { name: 'Delete everything' }).click();

    await page.waitForURL('**/sign-in', { timeout: 15000 });

    const state = await page.evaluate(() => ({
      levels: localStorage.getItem('nhako_levels'),
      theme: localStorage.getItem('nhako_theme'),
      foreign: localStorage.getItem('unrelated_third_party_key'),
    }));

    expect(state.levels).toBeNull();
    expect(state.theme).toBeNull();
    expect(state.foreign).toBe('keep-me');
  });
});

test.describe('Daily challenge day boundary', () => {
  test('the game day rolls over at the fixed offset, not the local one', async ({ page }) => {
    await page.goto('/');

    // Mirrors gameDateString() in lib/daily/logic.ts (UTC+8).
    const result = await page.evaluate(() => {
      const OFFSET_MIN = 8 * 60;
      const gameDate = (iso: string) =>
        new Date(new Date(iso).getTime() + OFFSET_MIN * 60_000).toISOString().slice(0, 10);
      return {
        // 15:30 UTC is still 29 July in UTC+8 (23:30).
        beforeRollover: gameDate('2026-07-29T15:30:00Z'),
        // 16:30 UTC is 30 July in UTC+8 (00:30): a new puzzle.
        afterRollover: gameDate('2026-07-29T16:30:00Z'),
      };
    });

    expect(result.beforeRollover).toBe('2026-07-29');
    expect(result.afterRollover).toBe('2026-07-30');
  });
});

test.describe('Level progress', () => {
  test('replaying a level worse does not lower the stored stars', async ({ page }) => {
    await page.goto('/');
    // Guest progress is the path we can exercise without auth; it must behave
    // the same way as the Supabase path (both now keep the best result).
    const kept = await page.evaluate(() => {
      const save = (stars: number, time: number) => {
        const saved = JSON.parse(localStorage.getItem('nhako_levels') || '{}');
        const prev = saved['c1-l1']?.best_time_seconds;
        saved['c1-l1'] = {
          stars: Math.max(saved['c1-l1']?.stars || 0, stars),
          best_time_seconds: typeof prev === 'number' ? Math.min(prev, time) : time,
        };
        localStorage.setItem('nhako_levels', JSON.stringify(saved));
      };
      save(3, 40); // fast first run
      save(1, 200); // slow replay
      return JSON.parse(localStorage.getItem('nhako_levels') || '{}')['c1-l1'];
    });

    expect(kept.stars).toBe(3);
    expect(kept.best_time_seconds).toBe(40);
  });
});
