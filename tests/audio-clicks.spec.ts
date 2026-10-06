import { test, expect } from '@playwright/test';

/*
 * Lofi click regression. Two bugs made the lofi tick: vinyl crackles whose
 * envelope and start were drawn at different random times (so some played at
 * full gain), and noise loops whose crossfade jumped at the seam. A click is a
 * sample-to-sample jump far above anything the music itself produces, so the
 * test renders each track offline and measures the largest second difference
 * against the signal's RMS.
 */
test('lofi tracks render without clicks', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/settings');
  await page.evaluate(() => localStorage.setItem('nhako_debug', '1'));
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __nhakoAudio?: unknown }).__nhakoAudio);

  for (const track of ['sunday', 'cafe', 'night', 'garden']) {
    const r = await page.evaluate(async track => {
      const api = (window as unknown as { __nhakoAudio: { renderAmbience: (s: number, v: unknown, t?: string, sr?: number) => Promise<AudioBuffer> } }).__nhakoAudio;
      const vols = { lofi: 100, rain: 0, wind: 0, birds: 0, thunder: 0, master: 100 };
      const buf = await api.renderAmbience(12, vols, track, 44100);
      let worst = 0;
      let sum = 0;
      let n = 0;
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 2; i < d.length; i++) {
          worst = Math.max(worst, Math.abs(d[i] - 2 * d[i - 1] + d[i - 2]));
          sum += d[i] * d[i];
          n++;
        }
      }
      return { ratio: worst / Math.sqrt(sum / n) };
    }, track);
    // Measured 0.81-0.97 with the bugs, 0.07-0.09 after the fix.
    expect(r.ratio, `${track}: click`).toBeLessThan(0.3);
  }
});

test('every game sound renders, audible and unclipped', async ({ page }) => {
  await page.goto('/settings');
  await page.evaluate(() => localStorage.setItem('nhako_debug', '1'));
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __nhakoAudio?: unknown }).__nhakoAudio);
  const names = ['tap', 'select', 'found', 'combo', 'miss', 'hint', 'star', 'win', 'whoosh', 'pop', 'unlock', 'countdown', 'go'];
  for (const name of names) {
    const peak = await page.evaluate(async name => {
      const api = (window as unknown as { __nhakoAudio: { renderEffects: (n: [string, number?][], gap?: number) => Promise<AudioBuffer> } }).__nhakoAudio;
      const buf = await api.renderEffects([[name, 2]], 1);
      let p = 0;
      for (let c = 0; c < 2; c++) for (const v of buf.getChannelData(c)) p = Math.max(p, Math.abs(v));
      return p;
    }, name);
    expect(peak, `${name}: silent`).toBeGreaterThan(0.02);
    expect(peak, `${name}: too hot`).toBeLessThan(0.9);
  }
});
