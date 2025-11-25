const CACHE_NAME = 'exocortex-grid-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
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

  // Skip WebSocket requests
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

        // Otherwise, fetch from network
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
                // Cache the fetched resource for future use
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, return a basic offline page for HTML requests
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return new Response(
                '<html><body><h1>Offline</h1><p>You are currently offline. Some features may not be available.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            }
            
            // For other requests, just let them fail
            throw new Error('Network request failed and no cache available');
          });
      })
  );
});

// Handle background sync for Nostr events when coming back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'nostr-events-sync') {
    event.waitUntil(syncNostrEvents());
  }
});

// Function to sync pending Nostr events
async function syncNostrEvents() {
  try {
    // Get pending events from IndexedDB
    const pendingEvents = await getPendingEventsFromDB();
    
    // Try to publish each event
    for (const event of pendingEvents) {
      try {
        await publishEventToRelays(event);
        await removePendingEventFromDB(event.id);
      } catch (error) {
        console.error('Failed to sync event:', error);
      }
    }
  } catch (error) {
    console.error('Error during sync:', error);
  }
}

// Helper functions for IndexedDB operations (simplified)
async function getPendingEventsFromDB() {
  // This would interface with your IndexedDB setup
  // For now, return empty array
  return [];
}

async function removePendingEventFromDB(eventId) {
  // Remove event from IndexedDB after successful sync
}

async function publishEventToRelays(event) {
  // Publish event to Nostr relays
  // This would use your existing Nostr publishing logic
}

// Handle push notifications (if needed later)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});