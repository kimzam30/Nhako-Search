const CACHE_NAME = 'nhakosearch-v3';
// Ambience is synthesised in the browser, so there are no audio files to
// precache. Drop an optional /audio/lofi.mp3 in and add it here if you ever
// want a real recording cached for offline use.
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch on individual adds if some assets are missing placeholder files
      return Promise.allSettled(ASSETS_TO_CACHE.map(asset => cache.add(asset)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  // Only cache same-origin requests (avoid caching Supabase API or Analytics)
  if (url.origin !== self.location.origin) return;

  // Bypass service worker entirely for Race mode to avoid RSC/navigation 503 issues
  if (url.pathname.startsWith('/play/race/')) return;

  // Bypass caching for Next.js internal requests (HMR, turbopack, etc)
  if (url.pathname.startsWith('/_next/')) return;

  // Bypass cache if the browser is requesting a reload (fixes infinite HMR reload loop)
  if (event.request.cache === 'reload' || event.request.cache === 'no-cache') return;

  const offlineFallback = () =>
    new Response('Network error occurred. You may be offline.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });

  // Navigations are NETWORK-FIRST.
  //
  // Cache-first on HTML meant a returning player could be served a stale
  // document — running old JS against a newer database schema — until the cache
  // happened to be revalidated. The cached copy is now only a fallback for
  // genuinely being offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.match(event.request))
            .then((cached) => cached || caches.match('/'))
            .then((cached) => cached || offlineFallback())
        )
    );
    return;
  }

  // Static assets stay cache-first with background revalidation.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || offlineFallback());
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
