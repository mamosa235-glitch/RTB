const CACHE_NAME = 'rtb-v4-pro';

// Fitxers mínims per arrancar
const INITIAL_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(INITIAL_CACHE))
  );
  self.skipWaiting();
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
      // Si el tenim a la cache, el donem ja (velocitat màxima)
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Si la resposta és bona, actualitzem la cache en segon pla (Stale-while-revalidate)
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // SI NO HI HA INTERNET:
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        throw err;
      });

      return cached || fetchPromise;
    })
  );
});
