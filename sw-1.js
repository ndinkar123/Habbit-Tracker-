/*
 * sw.js — Service Worker for Habits Pro
 * Caches assets with versioning. On update, old caches are cleaned up.
 * Supports SKIP_WAITING message for instant update.
 */
const CACHE_VERSION = 'habits-pro-v3';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './storage.js',
  './icons.js',
  './todo.js',
  './bmi.js',
  './style.css',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing');
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS);
    }).catch(err => {
      console.log('[SW] Cache error during install', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (name !== CACHE_VERSION) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
      .catch(() => {
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
