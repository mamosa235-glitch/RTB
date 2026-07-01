const CACHE_NAME = 'rtb-v6';

// Fitxers crítics inicials
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
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
      // Si el tenim a la cache, el retornem immediatament
      if (cached) {
        return cached;
      }

      // Si no el tenim, l'anem a buscar a internet i el guardem
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        // Si no hi ha internet i és una pàgina, intentem carregar la home
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      });
    })
  );
});
