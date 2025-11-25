const CACHE_NAME = 'exocortex-grid-v1';
const APP_SHELL_FILES = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg'
];

// Install event - cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip WebSocket requests (if any)
  if (event.request.url.startsWith('ws://') || event.request.url.startsWith('wss://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from network and cache for future use
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, return a basic offline page for HTML requests
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return new Response(
                '<!DOCTYPE html><html><head><title>Exocortex Grid - Offline</title><style>body{font-family:system-ui,sans-serif;background:#111827;color:#f3f4f6;padding:2rem;text-align:center}h1{color:#3b82f6;margin-bottom:1rem}</style></head><body><h1>Exocortex Grid</h1><p>You are currently offline. Your time tracking data is still available locally.</p></body></html>',
                {
                  headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache'
                  }
                }
              );
            }

            // For other requests, just let them fail
            throw new Error('Network request failed and no cache available');
          });
      })
  );
});