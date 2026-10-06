/**
 * Render the launch video and the posters from scene.html / posters.html.
 *
 *   node launch/video/capture.mjs      first: the app screenshots (dev server on :3003)
 *   node launch/video/audio.mjs        the soundtrack -> out/soundtrack.wav
 *   node launch/video/render.mjs                  the video -> launch/nhakosearch-launch.mp4
 *   node launch/video/render.mjs --stills [t,..]  a few frames -> out/still-*.png
 *   node launch/video/render.mjs --posters        the TikTok posters -> launch/posters/*.png
 *   node launch/video/render.mjs --serve          serve; open scene.html?play to watch
 *
 * Time never runs on its own: every frame calls renderFrame(t) with an exact
 * t and screenshots the result, so the output does not depend on how fast
 * this machine is. (The same approach as Nhako Tools' launch film.)
 */
/* global window */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, DURATION } from './timeline.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const HERE = fileURLToPath(new URL('./', import.meta.url));
const OUT = join(HERE, 'out');
const FINAL = join(ROOT, 'launch', 'nhakosearch-launch.mp4');
const mode = process.argv[2] ?? '--video';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  const file = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/launch/video/`;

async function open(browser, url, viewport, scale = 1) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.sceneReady === true, null, { timeout: 90_000 });
  return page;
}

if (mode === '--serve') {
  console.log(`${BASE}scene.html?play   ${BASE}posters.html?p=hero   (Ctrl+C to stop)`);
} else if (mode === '--posters') {
  const { POSTERS } = await import('./posters.js');
  const browser = await chromium.launch();
  const dir = join(ROOT, 'launch', 'posters');
  await mkdir(dir, { recursive: true });
  for (const name of process.argv[3]?.split(',') ?? Object.keys(POSTERS)) {
    const page = await open(browser, `${BASE}posters.html?p=${name}`, { width: W, height: H });
    const file = POSTERS[name].file ?? name;
    await page.screenshot({ path: join(dir, `${file}.png`) });
    console.log(`  launch/posters/${file}.png`);
    await page.close();
  }
  await browser.close();
} else {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await open(browser, `${BASE}scene.html`, { width: W, height: H });
  const cdp = await page.context().newCDPSession(page);
  const grab = async t => {
    await page.evaluate(t => window.renderFrameDecoded(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    return Buffer.from(data, 'base64');
  };
  if (mode === '--stills') {
    const times = (process.argv[3] ?? '1,2.6,5.5,9.8,14.5,17.5,20.6,23,26,31,34.5,37,41,43.5,46.5,47.9,50,53.5,56').split(',').map(Number);
    for (const t of times) {
      await writeFile(join(OUT, `still-${t.toFixed(1)}.png`), await grab(t));
      console.log(`  out/still-${t.toFixed(1)}.png`);
    }
  } else {
    const wav = join(OUT, 'soundtrack.wav');
    if (!existsSync(wav)) throw new Error('No soundtrack yet: run node launch/video/audio.mjs first.');
    const ff = spawn('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-i', wav,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
      '-movflags', '+faststart', '-shortest', FINAL,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((r, j) => ff.on('close', c => (c === 0 ? r() : j(new Error(`ffmpeg exited ${c}`)))));
    const frames = Math.round(DURATION * FPS);
    const started = Date.now();
    for (let f = 0; f < frames; f++) {
      const png = await grab(f / FPS);
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`  frame ${f}/${frames}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await done;
    console.log(`  ${FINAL}`);
  }
  await browser.close();
}
if (mode !== '--serve') server.close();
