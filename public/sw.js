// Bump on any change to the caching rules: `activate` deletes every other
// cache, which also clears the RSC payloads v3 accumulated.
const CACHE_NAME = 'nhakosearch-v4';

// The app shell: enough to open the app offline and play a free puzzle.
const ASSETS_TO_CACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS_TO_CACHE.map((asset) => cache.add(asset)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

const offlineText = () =>
  new Response('You are offline.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' },
  });

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Same-origin only: Supabase and fonts are never cached here.
  if (url.origin !== self.location.origin) return;

  // Race rooms are live; never serve them from cache.
  if (url.pathname.startsWith('/play/race/')) return;

  // React Server Component payloads vary by request headers, so a cached copy
  // can never be matched — v3 stored them anyway and the cache only grew.
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return;

  // Navigations: network first, cached copy of the SAME page when offline,
  // then a real offline page. Serving the home page's HTML under another URL
  // (the old fallback) made /daily render the home screen.
  //
  // Reloads are navigations too. The old worker skipped every request with
  // `cache: no-cache` — which is what a reload sends — so reloading offline
  // produced a blank browser error page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match('/offline.html')) ||
            offlineText()
          );
        })
    );
    return;
  }

  // Build output is content-hashed and immutable: cache-first is always right,
  // and it is what lets a cached page actually hydrate offline. (v3 skipped
  // /_next/ entirely, so an offline page could never run.)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.status === 200) cache.put(request, response.clone());
          return response;
        } catch {
          return offlineText();
        }
      })
    );
    return;
  }

  // Anything else under /_next (dev server, image optimiser) goes to the network.
  if (url.pathname.startsWith('/_next/')) return;

  // Other static files: cache-first with background revalidation.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.status === 200) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached || offlineText());
      return cached || network;
    })
  );
});
