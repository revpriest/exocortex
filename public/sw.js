const CACHE_NAME = 'exocortex-v1';

console.log('🔧 Service worker script loaded');

// Install event - cache the app shell
self.addEventListener('install', (event) => {
  console.log('📦 Service worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🗂️ Cache opened, adding core files...');

        // Cache the core files
        return cache.addAll([
          '/',
          '/manifest.webmanifest',
          '/icon.svg'
        ]);
      })
      .then(() => {
        console.log('✅ Core files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Failed to cache core files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service worker activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('🧹 Checking for old caches...');

      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service worker activated and claiming clients');
      return self.clients.claim();
    })
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

  const url = new URL(event.request.url);
  console.log('🌐 Fetching:', url.pathname);

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('✅ Served from cache:', url.pathname);
          return cachedResponse;
        }

        console.log('📡 Fetching from network:', url.pathname);

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              console.log('❌ Response not cacheable:', response?.status);
              return response;
            }

            // Only cache static assets (JS, CSS, HTML, images, icons, manifest)
            const isStaticAsset = [
              '.js', '.css', '.html', '.svg', '.png', '.jpg', '.jpeg',
              '.gif', '.ico', '.webp', '.webmanifest'
            ].some(ext => url.pathname.endsWith(ext)) ||
            url.pathname === '/';

            if (isStaticAsset) {
              console.log('💾 Caching static asset:', url.pathname);

              // Clone the response since it can only be consumed once
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch(error => {
                  console.error('❌ Cache put failed:', error);
                });
            }

            return response;
          })
          .catch((error) => {
            console.error('❌ Network fetch failed:', url.pathname, error);

            // If both cache and network fail, return a basic offline page for HTML requests
            if (event.request.headers.get('accept')?.includes('text/html')) {
              console.log('📱 Serving offline page for HTML request');

              return new Response(
                '<!DOCTYPE html><html><head><title>Exocortex - Offline</title><style>body{font-family:system-ui,sans-serif;background:#111827;color:#f3f4f6;padding:2rem;text-align:center}h1{color:#3b82f6;margin-bottom:1rem}</style></head><body><h1>Exocortex</h1><p>You are currently offline. Your time tracking data is still available locally.</p><p>Please check your internet connection and try again.</p></body></html>',
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