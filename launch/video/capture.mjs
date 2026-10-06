/**
 * Capture every screen the launch video and posters use, from the running app.
 *
 *   npx next dev -p 3003   (in another terminal)
 *   node launch/video/capture.mjs [name ...]   -> launch/video/shots/*.png
 *
 * Phones are 390x844 at 3x; the tablet and laptop shots are for the
 * "every device" scene. Words are found through the keyboard surface (the
 * same solver as tests/rewards.spec.ts), so boards show real finds. The two
 * multiplayer scenes open two guest browsers in one room over the live
 * Realtime channel, exactly as tests/race.spec.ts does.
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE ?? 'http://localhost:3003';
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
const only = new Set(process.argv.slice(2));
const want = name => !only.size || only.has(name);
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const meta = {};

const browser = await chromium.launch();

async function ctx({ theme = 'light', name = 'Kim', device = PHONE, storage = {} } = {}) {
  const context = await browser.newContext({ ...device, colorScheme: theme });
  await context.addInitScript(({ theme, name, storage }) => {
    try {
      localStorage.setItem('nhako_guest_mode', 'true');
      localStorage.setItem('nhako_guest_name', name);
      localStorage.setItem('nhako_theme', theme);
      for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
    } catch {}
    // The Next.js dev badge is not part of the app.
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = 'nextjs-portal{display:none!important}';
      document.head.append(s);
    });
  }, { theme, name, storage });
  return context;
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log('  shot', name);
}

/** Finds up to `limit` unfound words through the keyboard. Returns the words found. */
function solve(page, limit = 99, gap = 900) {
  return page.evaluate(async ({ limit, gap }) => {
    // Your own board: in a race the partner's read-only board is in the DOM too.
    const grid = document.querySelector('[role=grid]:not([aria-readonly])');
    const cells = [...grid.querySelectorAll('[data-x]')];
    const W = Math.max(...cells.map(c => +c.dataset.x)) + 1, H = Math.max(...cells.map(c => +c.dataset.y)) + 1;
    const L = {};
    cells.forEach(c => (L[`${c.dataset.x},${c.dataset.y}`] = (c.getAttribute('aria-label') || '').charAt(0)));
    const words = [...document.querySelectorAll('[aria-label="Words to find"] li')].filter(li => !li.dataset.found).map(li => li.innerText.trim().toUpperCase().replace(/[^A-Z]/g, ''));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    const find = w => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (const [dx, dy] of dirs) {
        let ok = true;
        for (let i = 0; i < w.length; i++) if (L[`${x + dx * i},${y + dy * i}`] !== w[i]) { ok = false; break; }
        if (ok) return { x, y, ex: x + dx * (w.length - 1), ey: y + dy * (w.length - 1) };
      }
      return null;
    };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const key = async k => { grid.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); await sleep(12); };
    const cur = () => { const f = grid.querySelector('[data-focused]'); return f ? [+f.dataset.x, +f.dataset.y] : [0, 0]; };
    const moveTo = async (tx, ty) => { for (let g = 0; g < 60; g++) { const [fx, fy] = cur(); if (fx === tx && fy === ty) return; await key(fx < tx ? 'ArrowRight' : fx > tx ? 'ArrowLeft' : fy < ty ? 'ArrowDown' : 'ArrowUp'); } };
    grid.focus();
    const done = [];
    for (const w of words) {
      if (done.length >= limit) break;
      const p = find(w);
      if (!p) continue;
      await moveTo(p.x, p.y); await key('Enter'); await moveTo(p.ex, p.ey); await key('Enter');
      done.push(w);
      await sleep(gap);
    }
    grid.blur();
    return done;
  }, { limit, gap });
}

const settle = page => page.waitForTimeout(1600);
const go = async (page, path) => { await page.goto(BASE + path, { waitUntil: 'networkidle' }); await settle(page); };

await mkdir(OUT, { recursive: true });

// ------------------------------------------------------------ single player
const levels = JSON.stringify(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`c1-l${i + 1}`, { stars: i % 3 === 1 ? 2 : 3, best_time_seconds: 40 }])));
const wallet = JSON.stringify({ tokens: 48, lifetime: 120 });

if (want('home') || want('home-dark')) {
  for (const theme of ['light', 'dark']) {
    const name = theme === 'light' ? 'home' : 'home-dark';
    if (!want(name)) continue;
    const c = await ctx({ theme, storage: { nhako_levels: levels, nhako_wallet: wallet } });
    const p = await c.newPage();
    await go(p, '/');
    await shot(p, name);
    await c.close();
  }
}

if (want('board')) {
  const c = await ctx({ storage: { nhako_wallet: wallet } });
  const p = await c.newPage();
  await go(p, '/play/standard/garden/medium');
  await p.waitForTimeout(900); // the level card fades
  await shot(p, 'board-0');
  for (let i = 1; i <= 3; i++) {
    const [w] = await solve(p, 1, 0);
    await p.waitForTimeout(1300); // capsule pops, butterfly lands
    meta[`board-${i}`] = w;
    await shot(p, `board-${i}`);
  }
  await p.getByRole('button', { name: /^Hint for/ }).click();
  await p.waitForTimeout(500);
  await shot(p, 'board-hint');
  await solve(p, 99, 250);
  await p.waitForTimeout(3200); // the celebration and reward count-up
  await shot(p, 'win');
  await c.close();
}

if (want('map')) {
  const c = await ctx({ storage: { nhako_levels: levels } });
  const p = await c.newPage();
  await go(p, '/level-path');
  await p.waitForTimeout(1200);
  await shot(p, 'map-garden');
  await c.close();
  // The night chapter reads best in the dark theme.
  const d = await ctx({ theme: 'dark', storage: { nhako_levels: levels } });
  const q = await d.newPage();
  await go(q, '/level-path');
  await q.evaluate(() => document.querySelector('section[data-theme="night"]').scrollIntoView({ block: 'center' }));
  await q.waitForTimeout(2400);
  await shot(q, 'map-night');
  await d.close();
}

for (const [name, path, after] of [
  ['daily', '/daily'],
  ['themes', '/play/standard'],
  ['album', '/album'],
  ['sound', '/settings', p => p.getByLabel('Master volume').scrollIntoViewIfNeeded()],
  ['howto', '/how-to-play'],
  ['howto-dirs', '/how-to-play', p => p.evaluate(() => document.getElementById('directions').scrollIntoView())],
  ['howto-install', '/how-to-play', p => p.evaluate(() => document.getElementById('install').scrollIntoView())],
]) {
  if (!want(name)) continue;
  const c = await ctx({ storage: { nhako_levels: levels, nhako_wallet: wallet } });
  const p = await c.newPage();
  await go(p, path);
  if (after) { await after(p); await p.waitForTimeout(900); }
  await shot(p, name);
  await c.close();
}

if (want('lobby')) {
  const c = await ctx();
  const p = await c.newPage();
  await go(p, '/play/race/lobby');
  await p.getByRole('tab', { name: 'Join room' }).click().catch(() => {});
  await p.getByRole('textbox').first().fill('KM7R4Q').catch(() => {});
  await p.waitForTimeout(400);
  await shot(p, 'lobby-join');
  await c.close();
}

// ------------------------------------------------------------- multiplayer
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXYZ2346789';
const roomCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

async function room(mode) {
  const code = roomCode();
  const lc = await ctx({ name: 'Kim' });
  const gc = await ctx({ name: 'Nera' });
  await lc.addInitScript(code => sessionStorage.setItem('is_leader_' + code, 'true'), code);
  const leader = await lc.newPage();
  const guest = await gc.newPage();
  await leader.goto(`${BASE}/play/race/${code}`);
  await guest.goto(`${BASE}/play/race/${code}`);
  await leader.getByText('Nera').first().waitFor({ timeout: 20000 });
  await guest.getByText('Kim').first().waitFor({ timeout: 20000 });
  if (mode === 'coop') await leader.getByRole('radio', { name: 'Together' }).click();
  await leader.getByRole('radio', { name: 'medium', exact: true }).click();
  await guest.getByRole('button', { name: 'Ready Up' }).click();
  const start = leader.getByRole('button', { name: mode === 'coop' ? 'Start Together' : 'Start Race' });
  await start.waitFor({ state: 'visible' });
  await leader.waitForFunction(() => ![...document.querySelectorAll('button')].some(b => /Waiting/.test(b.textContent)), null, { timeout: 15000 });
  await leader.waitForTimeout(600);
  return { code, lc, gc, leader, guest, start };
}

if (want('race')) {
  const r = await room('race');
  await shot(r.leader, 'room-leader');
  await shot(r.guest, 'room-guest');
  await r.start.click();
  await r.leader.locator('[data-x="0"][data-y="0"]').first().waitFor({ timeout: 20000 });
  await r.guest.locator('[data-x="0"][data-y="0"]').first().waitFor({ timeout: 20000 });
  await r.leader.waitForTimeout(4200); // the synced countdown
  await shot(r.leader, 'race-countdown');
  await Promise.all([solve(r.leader, 3, 700), solve(r.guest, 2, 900)]);
  await r.leader.waitForTimeout(1500);
  await shot(r.leader, 'race-leader');
  await shot(r.guest, 'race-guest');
  await r.lc.close(); await r.gc.close();
}

if (want('coop')) {
  const r = await room('coop');
  await r.start.click();
  await r.leader.locator('[data-x="0"][data-y="0"]').first().waitFor({ timeout: 20000 });
  await r.guest.locator('[data-x="0"][data-y="0"]').first().waitFor({ timeout: 20000 });
  await r.leader.waitForTimeout(4200);
  await solve(r.leader, 2, 700);
  await solve(r.guest, 2, 700);
  await r.leader.waitForTimeout(1500);
  await shot(r.leader, 'coop-board');
  // A short chat: the guest says hi, the leader answers.
  for (const [p, text] of [[r.guest, 'found MEADOW!'], [r.leader, 'nice!! I got two'], [r.guest, 'last one is yours']]) {
    const input = p.getByPlaceholder(/^Message/);
    // Open the chat sheet unless it is already up from the last message.
    if (!(await input.isVisible().catch(() => false))) await p.getByRole('button', { name: /^Chat/ }).click();
    await input.fill(text);
    await input.press('Enter');
    await p.waitForTimeout(900);
  }
  await r.guest.waitForTimeout(800);
  await shot(r.guest, 'coop-chat');
  await shot(r.leader, 'coop-chat-leader');
  await r.lc.close(); await r.gc.close();
}

// ---------------------------------------------------------- other devices
if (want('tablet')) {
  const c = await ctx({ device: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, storage: { nhako_levels: levels, nhako_wallet: wallet } });
  const p = await c.newPage();
  await go(p, '/play/standard/ocean/medium');
  await p.waitForTimeout(900);
  await solve(p, 3, 600);
  await p.waitForTimeout(1300);
  await shot(p, 'tablet');
  await c.close();
}
if (want('laptop')) {
  const c = await ctx({ device: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, storage: { nhako_levels: levels, nhako_wallet: wallet } });
  const p = await c.newPage();
  await go(p, '/');
  await shot(p, 'laptop');
  await c.close();
}

await writeFile(`${OUT}meta.json`, JSON.stringify(meta, null, 2));
await browser.close();
