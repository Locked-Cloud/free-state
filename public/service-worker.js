// Service Worker for Free State PWA
const CACHE_NAME = 'free-state-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  // Add other static assets here
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache open failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip API requests and external resources from caching
  if (event.request.url.includes('/api/') || 
      !event.request.url.startsWith(self.location.origin)) {
    return fetch(event.request);
  }
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Don't cache API requests or external resources
                // Skip real-time API calls (POST/PUT/DELETE) but cache successful GET requests
                if (event.request.method !== 'GET') {
                  return;
                }

                // Allow runtime caching for same-origin assets **and** common external CDNs / image hosts
                const allowedExternal = [
                  'drive.google.com',
                  'lh3.googleusercontent.com',
                  'fonts.googleapis.com',
                  'fonts.gstatic.com'
                ];

                const { hostname } = new URL(event.request.url);
                const isSameOrigin = event.request.url.startsWith(self.location.origin);
                const isAllowedExternal = allowedExternal.includes(hostname);

                if (!isSameOrigin && !isAllowedExternal) {
                  return;
                }

                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
      .catch((error) => {
        console.error('Fetch failed:', error);
        // Return the offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms());
  }
});

// Function to sync stored form data when back online
async function syncForms() {
  try {
    // This would be implemented to send stored form data
    // when the user comes back online
    console.log('Syncing stored form data');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'logo192.png',
    badge: 'favicon.ico',
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
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