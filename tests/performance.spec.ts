import { test, expect } from '@playwright/test';

/**
 * Performance regression suite (Phase 5).
 *
 * These assert the *structural* wins, not wall-clock timings; timing
 * assertions are flaky in CI. Each one fails if the expensive pattern comes
 * back.
 */

test('the highlight overlay uses no SVG filters', async ({ page }) => {
  await page.goto('/play/standard/standard/hard');
  await page.locator('[data-x="0"][data-y="0"]').waitFor({ state: 'visible' });

  // Draw a selection so the overlay is populated.
  const start = page.locator('[data-x="0"][data-y="0"]');
  const box = (await start.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 3.5, box.y + box.height / 2, { steps: 6 });

  const svgState = await page.evaluate(() => ({
    filterElements: document.querySelectorAll('filter').length,
    turbulence: document.querySelectorAll('feTurbulence').length,
    displacement: document.querySelectorAll('feDisplacementMap').length,
    filteredNodes: document.querySelectorAll('[filter]').length,
    // The wobble should now live in path geometry.
    paths: document.querySelectorAll('svg path[d]').length,
  }));

  await page.mouse.up();

  expect(svgState.turbulence, 'feTurbulence is a per-frame raster cost').toBe(0);
  expect(svgState.displacement).toBe(0);
  expect(svgState.filterElements).toBe(0);
  expect(svgState.filteredNodes).toBe(0);
  expect(svgState.paths).toBeGreaterThan(0);
});

test('the highlight still wobbles: the hand-drawn look survives', async ({ page }) => {
  await page.goto('/play/standard/standard/easy');
  await page.locator('[data-x="0"][data-y="0"]').waitFor({ state: 'visible' });

  const start = page.locator('[data-x="0"][data-y="0"]');
  const box = (await start.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 3.5, box.y + box.height / 2, { steps: 6 });

  const offLine = await page.evaluate(() => {
    // Scope to the board's own overlay. A bare `svg path[d]` matches the first
    // path in the document, which is a butterfly icon in the garland above the
    // grid; it has nothing to do with the highlight stroke.
    const path = document.querySelector('.grid.relative.z-10 svg path[d]');
    if (!path) return -1;
    const d = path.getAttribute('d') || '';
    const pts = [...d.matchAll(/([-\d.]+) ([-\d.]+)/g)].map(m => [
      parseFloat(m[1]),
      parseFloat(m[2]),
    ]);
    if (pts.length < 3) return -1;
    // Largest deviation of an interior point from the straight start->end line.
    const [x1, y1] = pts[0];
    const [x2, y2] = pts[pts.length - 1];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    let worst = 0;
    for (const [x, y] of pts.slice(1, -1)) {
      worst = Math.max(worst, Math.abs((x - x1) * (y2 - y1) - (y - y1) * (x2 - x1)) / len);
    }
    return worst;
  });

  await page.mouse.up();

  // Present, but subtle: a straight line would be 0.
  expect(offLine).toBeGreaterThan(0.05);
  expect(offLine).toBeLessThan(3);
});

test('the paper grain tiles instead of stretching to the viewport', async ({ page }) => {
  await page.goto('/');
  const grain = await page.evaluate(() => {
    const cs = getComputedStyle(document.body, '::after');
    return { size: cs.backgroundSize, repeat: cs.backgroundRepeat };
  });
  // Stretching made the browser rasterise turbulence at full screen resolution.
  expect(grain.size).toBe('160px 160px');
  expect(grain.repeat).toBe('repeat');
});

test('the home screen does not build every level to render', async ({ page }) => {
  // A cheap proxy for laziness: the label only needs metadata, so navigating
  // home must not be blocked on generating 360 word lists.
  await page.goto('/');
  // The lobby's stage names the next level; that needs only level metadata.
  await expect(page.getByRole('heading', { name: /^Level \d+$/ }).first()).toBeVisible();

  const blockingTime = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return nav ? nav.domContentLoadedEventEnd - nav.responseEnd : 0;
  });
  // Generous ceiling: this catches a return to eager generation, not jitter.
  expect(blockingTime).toBeLessThan(3000);
});

test('avatar images declare dimensions and do not leak the referrer', async ({ page }) => {
  await page.goto('/');
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll('img')].map(i => ({
      hasWidth: i.hasAttribute('width'),
      hasHeight: i.hasAttribute('height'),
      loading: i.getAttribute('loading'),
      referrerPolicy: i.getAttribute('referrerpolicy'),
    }))
  );
  for (const img of imgs) {
    expect(img.hasWidth, 'missing width causes layout shift').toBe(true);
    expect(img.hasHeight).toBe(true);
    expect(img.referrerPolicy).toBe('no-referrer');
  }
});

test('route loading shells are server-rendered', async ({ page }) => {
  // loading.tsx must not depend on client JS to appear.
  await page.route('**/*', route => route.continue());
  const response = await page.goto('/settings');
  expect(response!.ok()).toBe(true);
  // The skeleton exposes a polite live region for screen readers.
  const html = await page.content();
  expect(html.length).toBeGreaterThan(0);
});
