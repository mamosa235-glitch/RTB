const CACHE_NAME = 'rtb-v11-fixed';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png',
  '/daily-rewards',
  '/settings'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        if (res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match('/'));
    })
  );
});
