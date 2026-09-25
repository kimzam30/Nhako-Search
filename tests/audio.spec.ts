import { test, expect } from '@playwright/test';

/**
 * Ambience regression suite (Phase 3).
 *
 * Previously the five "mp3" files were uncompressed WAVs, thunder was a
 * byte-identical copy of rain, and the mixer in the nav was missing the thunder
 * channel entirely. Audio is now generated in the browser, so these tests cover
 * the control surface and assert nothing is fetched.
 */

/** Settings shows the mixer inline; wait for it to hydrate. */
async function openMixer(page: import('@playwright/test').Page) {
  await page.getByLabel('Master volume').waitFor({ state: 'visible' });
}

test('settings exposes every channel and all presets', async ({ page }) => {
  await page.goto('/settings');

  await openMixer(page);

  // Every slider is reachable by its label (they were unlabelled before).
  for (const label of ['Master volume', 'Lofi beats', 'Rain', 'Thunder', 'Wind', 'Morning birds', 'Game sounds']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }

  for (const preset of ['Focus', 'Meadow', 'Thunderstorm', 'Quiet Night']) {
    await expect(page.getByRole('button', { name: preset })).toBeVisible();
  }
});

test('a preset rewrites the whole mix and persists it', async ({ page }) => {
  await page.goto('/settings');
  await openMixer(page);

  await page.getByRole('button', { name: 'Thunderstorm' }).click();

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('nhako_audio_volumes');
    return raw ? JSON.parse(raw) : null;
  });

  expect(stored).not.toBeNull();
  // Storm: heavy rain and thunder, no birds.
  expect(stored.rain).toBeGreaterThan(50);
  expect(stored.thunder).toBeGreaterThan(0);
  expect(stored.birds).toBe(0);

  // Survives a reload.
  await page.reload();
  await openMixer(page);
  const afterReload = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('nhako_audio_volumes') || '{}')
  );
  expect(afterReload.rain).toBe(stored.rain);
});

test('an older saved mix is upgraded rather than discarded', async ({ page }) => {
  await page.goto('/settings');
  // A payload from before the thunder channel existed.
  await page.evaluate(() => {
    localStorage.setItem(
      'nhako_audio_volumes',
      JSON.stringify({ master: 70, lofi: 42, rain: 10, wind: 5, birds: 3 })
    );
  });
  await page.reload();
  await openMixer(page);

  // Existing values kept, missing channel filled from defaults.
  await expect(page.getByLabel('Lofi beats', { exact: true })).toHaveValue('42');
  const merged = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('nhako_audio_volumes') || '{}')
  );
  expect(merged.lofi).toBe(42);
  expect(typeof merged.thunder).toBe('number');
});

test('no audio files are requested — ambience is generated', async ({ page }) => {
  const audioRequests: string[] = [];
  page.on('request', req => {
    if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(req.url())) audioRequests.push(req.url());
  });

  await page.goto('/settings');
  await openMixer(page);
  await page.getByRole('button', { name: 'Focus' }).click();
  await page.waitForTimeout(1500);

  expect(audioRequests).toEqual([]);
});

test('the in-game sound sheet includes every channel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/play/standard/standard/easy');

  // Gameplay is immersive: Sound lives in the top bar and opens a sheet.
  await page.getByRole('button', { name: 'Sound' }).click();
  const sheet = page.getByRole('dialog', { name: 'Sound' });
  await expect(sheet).toBeVisible();

  for (const label of ['Master volume', 'Lofi beats', 'Rain', 'Thunder', 'Wind', 'Morning birds', 'Game sounds']) {
    await expect(sheet.getByLabel(label, { exact: true })).toBeVisible();
  }
});
