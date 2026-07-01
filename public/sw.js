const CACHE_NAME = 'rtb-ultimate-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map(name => caches.delete(name)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Guardem una còpia de tot el que provingui de la nostra web
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Si estem offline, intentem retornar el que tenim
          return cachedResponse;
        });

        // Si ja ho tenim a cache, ho donem, si no esperem a la xarxa
        return cachedResponse || fetchPromise;
      });
    })
  );
});
