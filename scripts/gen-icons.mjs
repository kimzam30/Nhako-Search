/*
 * Regenerates the PWA / favicon set from one SVG (docs/game-feel.md):
 * the doodle butterfly on a page of squared notebook paper with a strip of
 * NeraOS washi tape. Run: node scripts/gen-icons.mjs  (uses Playwright's Chromium)
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = f => path.join(root, 'public', f);

const INK = '#4A1942';
const butterfly = `
  <g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M23 19C19 9 11 3.5 5.5 5.2C1.2 6.6 2 13.5 6.8 17.3C10.5 20.2 16.8 21 23 19Z" fill="#FF9AC4"/>
    <path d="M25 19C29 9 37 3.5 42.5 5.2C46.8 6.6 46 13.5 41.2 17.3C37.5 20.2 31.2 21 25 19Z" fill="#FF9AC4"/>
    <path d="M23 20.5C17.5 21.5 10.8 24.8 10.2 30.2C9.8 34.2 14 36 17.6 33.6C21 31.3 22.6 25.8 23 20.5Z" fill="#C3A6F0"/>
    <path d="M25 20.5C30.5 21.5 37.2 24.8 37.8 30.2C38.2 34.2 34 36 30.4 33.6C27 31.3 25.4 25.8 25 20.5Z" fill="#C3A6F0"/>
    <path d="M24 12.5C22.6 16 22.6 25 24 30.5C25.4 25 25.4 16 24 12.5Z" fill="${INK}"/>
    <path d="M23.4 12.8C22 9 19.8 6.8 17.8 6.2" fill="none"/>
    <path d="M24.6 12.8C26 9 28.2 6.8 30.2 6.2" fill="none"/>
  </g>
  <circle cx="10" cy="11" r="2" fill="#FFFDFE"/><circle cx="38" cy="11" r="2" fill="#FFFDFE"/>
  <circle cx="15.5" cy="29.5" r="1.4" fill="#FFFDFE"/><circle cx="32.5" cy="29.5" r="1.4" fill="#FFFDFE"/>`;

/** `full`: edge-to-edge square (maskable / apple). `detail`: grid + tape (off for tiny favicons). */
function svg({ full = false, detail = true, scale = 0.62 } = {}) {
  const r = full ? 0 : 112;
  const w = 512 * scale;
  const h = (w * 40) / 48;
  const lines = detail
    ? Array.from({ length: 9 }, (_, i) => 32 + i * 56)
        .map(p => `<path d="M${p} 0V512M0 ${p}H512" stroke="${INK}" stroke-opacity="0.07" stroke-width="3"/>`)
        .join('')
    : '';
  const tape = detail
    ? `<g transform="rotate(-35 96 70)"><rect x="-10" y="48" width="220" height="46" rx="4" fill="url(#stripes)" opacity="0.85"/></g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <pattern id="stripes" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="20" height="40" fill="#F49AC1"/><rect x="20" width="20" height="40" fill="#C3A6F0"/>
      </pattern>
      <clipPath id="c"><rect width="512" height="512" rx="${r}"/></clipPath>
    </defs>
    <g clip-path="url(#c)">
      <rect width="512" height="512" fill="#FFF6F8"/>
      ${lines}
      ${tape}
      <svg x="${(512 - w) / 2}" y="${(512 - h) / 2 + 10}" width="${w}" height="${h}" viewBox="0 0 48 40">${butterfly}</svg>
    </g>
  </svg>`;
}

const jobs = [
  { file: 'icons/icon-512.png', size: 512, opts: {} },
  { file: 'icons/icon-192.png', size: 192, opts: {} },
  // Maskable: the platform crops to its own shape, so the butterfly sits in the 80% safe zone.
  { file: 'icons/icon-maskable-512.png', size: 512, opts: { full: true, scale: 0.5 } },
  { file: 'icons/apple-touch-icon.png', size: 180, opts: { full: true, scale: 0.58 } },
  { file: 'icons/favicon-48.png', size: 48, opts: { detail: false, scale: 0.8 } },
  { file: 'icons/favicon-32.png', size: 32, opts: { detail: false, scale: 0.84 } },
  { file: '.favicon-16.png', size: 16, opts: { detail: false, scale: 0.88 } },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { file, size, opts } of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${svg(opts).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</div></body></html>`
  );
  await page.screenshot({ path: out(file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}
await browser.close();

// favicon.ico: 16/32/48 in one file (ImageMagick).
execFileSync('convert', [out('.favicon-16.png'), out('icons/favicon-32.png'), out('icons/favicon-48.png'), out('favicon.ico')]);
execFileSync('rm', [out('.favicon-16.png')]);
console.log('wrote favicon.ico');
