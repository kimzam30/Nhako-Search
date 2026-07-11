const CACHE_NAME = 'nhakosearch-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/audio/lofi.mp3',
  '/audio/rain.mp3',
  '/audio/wind.mp3',
  '/audio/birds.mp3',
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

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Return cached or offline fallback to prevent TypeError
          return new Response('Network error occurred. You may be offline.', { 
            status: 503, 
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
