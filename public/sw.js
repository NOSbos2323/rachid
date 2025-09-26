const CACHE_NAME = 'waali-gs-v1.0.0';
const STATIC_CACHE = 'waali-gs-static-v1';
const DYNAMIC_CACHE = 'waali-gs-dynamic-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/waali-gas-logo.svg',
  '/vite.svg',
  '/manifest.webmanifest'
];

const STATIC_ASSETS = [
  '/screens/Screenshot-1256.png',
  '/screens/Screenshot-1257.png',
  '/screens/Screenshot-1258.png',
  '/screens/Screenshot-1259.png',
  '/screens/Screenshot-1260.png'
];

// Install event - cache app shell and static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      }),
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
    ]).catch((error) => {
      console.error('[SW] Install failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;
  
  // Skip API calls (let them go to network)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network unavailable' }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      }
      
      // Network first for HTML pages
      if (request.headers.get('accept').includes('text/html')) {
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Fallback to cached index.html for navigation requests
            return caches.match('/index.html');
          });
      }
      
      // Cache first for other resources
      return fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version or offline page
          return caches.match(request) || 
                 caches.match('/index.html');
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline actions when back online
      handleBackgroundSync()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'إشعار جديد من محطة وعلي',
    icon: '/waali-gas-logo.svg',
    badge: '/waali-gas-logo.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'عرض التفاصيل',
        icon: '/waali-gas-logo.svg'
      },
      {
        action: 'close',
        title: 'إغلاق',
        icon: '/waali-gas-logo.svg'
      }
    ],
    requireInteraction: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification('محطة وعلي للوقود', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Helper function for background sync
async function handleBackgroundSync() {
  try {
    // Handle any queued offline actions
    console.log('[SW] Handling background sync');
    
    // Example: Send queued data to server
    const queuedData = await getQueuedData();
    if (queuedData.length > 0) {
      await sendQueuedData(queuedData);
      await clearQueuedData();
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Placeholder functions for offline queue management
async function getQueuedData() {
  // Implementation would retrieve queued data from IndexedDB
  return [];
}

async function sendQueuedData(data) {
  // Implementation would send data to server
  console.log('[SW] Sending queued data:', data);
}

async function clearQueuedData() {
  // Implementation would clear queued data from IndexedDB
  console.log('[SW] Clearing queued data');
}