import { test, expect } from '@playwright/test';

/**
 * Ambience regression suite (Phase 3).
 *
 * Previously the five "mp3" files were uncompressed WAVs, thunder was a
 * byte-identical copy of rain, and the mixer in the nav was missing the thunder
 * channel entirely. Audio is now generated in the browser, so these tests cover
 * the control surface and assert nothing is fetched.
 */

const CHANNELS = ['Lofi', 'Rain', 'Thunder', 'Wind', 'Birds'];

test('settings exposes every channel and all presets', async ({ page }) => {
  await page.goto('/settings');

  const mixer = page.getByRole('button', { name: 'Sound Mixer' });
  await mixer.click();

  for (const label of ['Master Volume', 'Lofi Beats', 'Rain Drops', 'Thunder', 'Wind Swirl', 'Morning Birds']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  for (const preset of ['Focus', 'Meadow', 'Thunderstorm', 'Quiet Night']) {
    await expect(page.getByRole('button', { name: preset })).toBeVisible();
  }
});

test('a preset rewrites the whole mix and persists it', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sound Mixer' }).click();

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
  await page.getByRole('button', { name: 'Sound Mixer' }).click();
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
  await page.getByRole('button', { name: 'Sound Mixer' }).click();

  // Existing values kept, missing channel filled from defaults.
  await expect(page.getByText('42%')).toBeVisible();
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
  await page.getByRole('button', { name: 'Sound Mixer' }).click();
  await page.getByRole('button', { name: 'Focus' }).click();
  await page.waitForTimeout(1500);

  expect(audioRequests).toEqual([]);
});

test('the nav mixer includes every channel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  // Nav mixer only appears during gameplay.
  await page.goto('/play/standard/standard/easy');

  const navToggle = page.locator('div.fixed.bottom-6 > div > button');
  await navToggle.waitFor({ state: 'visible' });
  await navToggle.click();

  // The volume button sits inside the expanded pill.
  const volumeBtn = page.locator('div.fixed.bottom-6 button').last();
  await volumeBtn.click();

  for (const label of ['Master', ...CHANNELS]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});
