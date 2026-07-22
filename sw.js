const CACHE_NAME = 'habits-pro-v2';

// 1. Updated ASSETS array with the new modular architecture
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/variables.css',
  './css/layout.css',
  './css/components.css',
  './js/state.js',
  './js/features.js',
  './js/ui.js',
  './js/app.js'
];

// 2. Install Event: Cache all new assets
self.addEventListener('install', event => {
  // skipWaiting forces the new service worker to take over immediately
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching new app assets');
      return cache.addAll(ASSETS);
    })
  );
});

// 3. Activate Event (NEW): Delete the old 'habits-pro-v1' cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  // claim() ensures the service worker controls all open tabs immediately
  return self.clients.claim();
});

// 4. Fetch Event: Serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
