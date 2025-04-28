/* eslint-disable no-restricted-globals */

// Service Worker for Salat-e-Mustaqeem Prayer Times App

// Cache name with version number
const CACHE_NAME = 'salat-e-mustaqeem-cache-v1';

// Assets to cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo192.png',
  '/logo512.png',
  '/audio/athan/default.mp3',
  '/audio/athan/al-makkah.mp3',
  '/audio/athan/al-madinah.mp3',
  '/audio/athan/egyptian.mp3',
  '/audio/athan/turkey.mp3',
  '/audio/beep.mp3'
];

// Prayer times data (will be updated by the app)
let prayerTimesData = [];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and content');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
      );
    })
  );
  
  // Ensure clients claim immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, then network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // For API or dynamic content - network first, then cache
  if (event.request.url.includes('/api/') || event.request.url.includes('prayer-times')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // Clone the response to store in cache and return
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // If network fails, try from cache
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets - cache first, then network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If not in cache, get from network
        return fetch(event.request).then((response) => {
          // Cache valid responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'PRAYER_TIMES_UPDATE') {
    // Store prayer times in service worker
    prayerTimesData = event.data.prayerTimes;
    console.log('[Service Worker] Prayer times updated:', prayerTimesData);
  }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);
  
  const prayerName = event.notification.data?.prayer || '';
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;
  
  event.notification.close();
  
  // This looks to see if the current is already open
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // If a window is already open, focus it and send a message
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'PRAYER_NOTIFICATION_CLICK',
            prayer: prayerName
          });
          return;
        }
      }
      
      // If no window is open, open one
      if (self.clients && self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen).then((windowClient) => {
          // Wait a bit for the window to load
          return new Promise((resolve) => {
            setTimeout(() => {
              if (windowClient) {
                windowClient.postMessage({
                  type: 'PRAYER_NOTIFICATION_CLICK',
                  prayer: prayerName
                });
              }
              resolve();
            }, 1000);
          });
        });
      }
    })
  );
});

// Handle push notifications (for future implementation with a backend)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push notification received:', data);
    
    const title = data.title || 'Prayer Time';
    const options = {
      body: data.body || 'It\'s time for prayer',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag || 'prayer-notification',
      data: data.data || { url: '/' }
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('[Service Worker] Error handling push notification:', error);
    
    // Fallback to simple notification
    event.waitUntil(
      self.registration.showNotification('Prayer Times', {
        body: 'New prayer time notification',
        icon: '/favicon.svg'
      })
    );
  }
});

// Periodically sync with the main thread to stay active
// This helps on some browsers that might otherwise put the service worker to sleep
self.addEventListener('sync', (event) => {
  if (event.tag === 'prayer-times-sync') {
    console.log('[Service Worker] Sync event triggered');
    event.waitUntil(
      // Send message to all clients to check if prayer times need updating
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CHECK_PRAYER_TIMES'
          });
        });
      })
    );
  }
});

console.log('[Service Worker] Loaded and ready to serve content offline');