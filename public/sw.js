// Simple cache-first service worker for offline support
const CACHE_NAME = 'rdk-cache-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        OFFLINE_URL,
        '/index.html',
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Put a copy in the cache for future visits
          return caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(event.request, response.clone());
            } catch (e) {
              // Some responses (opaque) may fail to be cached; ignore
            }
            return response;
          });
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
