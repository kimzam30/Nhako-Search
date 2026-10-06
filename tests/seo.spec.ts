import { test, expect } from '@playwright/test';

/*
 * Search and share metadata. Pages are fetched as raw HTML: crawlers and link
 * previews read the server response, not the hydrated page.
 */
const head = async (request: import('@playwright/test').APIRequestContext, path: string) => {
  const html = await (await request.get(path)).text();
  const pick = (re: RegExp) => html.match(re)?.[1] ?? null;
  return {
    html,
    title: pick(/<title>([^<]*)<\/title>/),
    canonical: pick(/<link rel="canonical" href="([^"]*)"/),
    robots: pick(/<meta name="robots" content="([^"]*)"/),
    ogImage: pick(/<meta property="og:image" content="([^"]*)"/),
    ogTitle: pick(/<meta property="og:title" content="([^"]*)"/),
  };
};

test('indexable pages have their own title, canonical and share image', async ({ request }) => {
  for (const [path, title] of [
    ['/', 'NhakoSearch: Free Cozy Word Search Game for Two'],
    ['/daily', 'Daily Word Search Puzzle | NhakoSearch'],
    ['/how-to-play', 'How to play | NhakoSearch'],
    ['/play/race/lobby', 'Multiplayer Word Search with a Friend | NhakoSearch'],
    ['/level-path', 'Word Search Levels | NhakoSearch'],
    ['/play/standard', 'Free Play Word Search | NhakoSearch'],
  ]) {
    const h = await head(request, path);
    expect(h.title, path).toBe(title);
    expect(h.ogTitle, path).toBe(title);
    expect(h.canonical, path).toMatch(new RegExp(`${path === '/' ? '' : path}$`));
    expect(h.ogImage, path).toContain('/opengraph-image.png');
    expect(h.robots, path).toBeNull();
  }
});

test('personal pages, boards and rooms are noindex without a borrowed canonical', async ({ request }) => {
  for (const path of ['/profile', '/settings', '/friends', '/album', '/sign-in', '/level-path/c1-l1', '/play/race/ABCDEF']) {
    const h = await head(request, path);
    expect(h.robots, path).toBe('noindex, follow');
    expect(h.canonical, path).toBeNull();
    expect(h.title, path).toMatch(/ \| NhakoSearch$/);
  }
  expect((await head(request, '/level-path/c1-l1')).title).toBe('Garden Level 1 | NhakoSearch');
});

test('home carries valid VideoGame structured data', async ({ request }) => {
  const { html } = await head(request, '/');
  const raw = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
  expect(raw).toBeTruthy();
  const data = JSON.parse(raw!);
  const game = data['@graph'].find((n: { '@type': string | string[] }) => [n['@type']].flat().includes('VideoGame'));
  expect(game.isAccessibleForFree).toBe(true);
  expect(game.playMode).toContain('MultiPlayer');
});

test('robots.txt and sitemap.xml point at the indexable pages only', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /play/race/');
  expect(robots).toContain('Allow: /play/race/lobby');
  expect(robots).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const p of ['/daily', '/how-to-play', '/play/race/lobby']) expect(sitemap).toContain(`${p}</loc>`);
  expect(sitemap).not.toContain('/profile');
  expect(sitemap).not.toContain('/level-path/c');
});

test('the share image is served as a 1200x630 PNG', async ({ request }) => {
  const res = await request.get('/opengraph-image.png');
  expect(res.headers()['content-type']).toBe('image/png');
  const png = await res.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});
