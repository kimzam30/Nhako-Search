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

  for (const preset of ['Focus', 'Rainy café', 'Meadow', 'Thunderstorm', 'Night drive', 'Garden party']) {
    await expect(page.getByRole('button', { name: preset, exact: true })).toBeVisible();
  }

  // Four generated lofi tracks to choose from.
  const tracks = page.getByRole('radiogroup', { name: 'Lofi track' }).getByRole('radio');
  await expect(tracks).toHaveCount(4);
});

test('choosing a lofi track persists it', async ({ page }) => {
  await page.goto('/settings');
  await openMixer(page);
  const group = page.getByRole('radiogroup', { name: 'Lofi track' });
  await group.getByRole('radio', { name: 'Night drive' }).click();
  await expect(group.getByRole('radio', { name: 'Night drive' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('nhako_lofi_track'))).toBe('night');
  await page.reload();
  await openMixer(page);
  await expect(page.getByRole('radiogroup', { name: 'Lofi track' }).getByRole('radio', { name: 'Night drive' })).toHaveAttribute('aria-checked', 'true');
});

/*
 * Every layer rendered offline (no speaker needed): each must actually make
 * sound, sit in a sensible loudness range, and never clip, including all
 * channels at 100%, which peaked at 1.24 before the limiter was added.
 */
test('every ambience layer renders at a sane level without clipping', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/settings');
  await page.evaluate(() => localStorage.setItem('nhako_debug', '1'));
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __nhakoAudio?: unknown }).__nhakoAudio);

  const cases: [string, Record<string, number>, string?][] = [
    ['rain', { rain: 100 }],
    ['wind', { wind: 100 }],
    ['birds', { birds: 100 }],
    ['thunder', { rain: 100, thunder: 100 }],
    ['lofi sunday', { lofi: 100 }, 'sunday'],
    ['lofi cafe', { lofi: 100 }, 'cafe'],
    ['lofi night', { lofi: 100 }, 'night'],
    ['lofi garden', { lofi: 100 }, 'garden'],
    ['everything', { lofi: 100, rain: 100, wind: 100, birds: 100, thunder: 100 }, 'night'],
  ];
  for (const [name, vols, track] of cases) {
    const r = await page.evaluate(
      async ({ vols, track, secs }) => {
        const full = { lofi: 0, rain: 0, wind: 0, birds: 0, thunder: 0, master: 100, ...vols };
        const api = (window as unknown as { __nhakoAudio: { renderAmbience: (s: number, v: unknown, t?: string, sr?: number) => Promise<AudioBuffer> } }).__nhakoAudio;
        const buf = await api.renderAmbience(secs, full, track, 16000);
        let peak = 0;
        let sum = 0;
        let bad = 0;
        for (let c = 0; c < 2; c++) {
          const d = buf.getChannelData(c);
          for (let i = 0; i < d.length; i++) {
            if (!Number.isFinite(d[i])) bad++;
            peak = Math.max(peak, Math.abs(d[i]));
            sum += d[i] * d[i];
          }
        }
        return { peak, rmsDb: 20 * Math.log10(Math.sqrt(sum / (buf.length * 2)) + 1e-12), bad };
      },
      { vols, track, secs: name === 'thunder' ? 24 : 10 }
    );
    expect(r.bad, `${name}: non-finite samples`).toBe(0);
    expect(r.peak, `${name}: clipping`).toBeLessThanOrEqual(1);
    expect(r.rmsDb, `${name}: silent`).toBeGreaterThan(-36);
    expect(r.rmsDb, `${name}: too loud`).toBeLessThan(-9);
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

test('no audio files are requested: ambience is generated', async ({ page }) => {
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
