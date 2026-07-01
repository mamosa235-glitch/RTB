const CACHE_NAME = 'rtb-v12-final';

// Llista de totes les pàgines i recursos del teu joc
const APP_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png',
  '/daily-rewards',
  '/settings',
  '/daily-rewards.html',
  '/settings.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching app shell');
      return cache.addAll(APP_FILES);
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
      // Si el tenim a cache, el retornem (molt ràpid)
      if (cached) return cached;

      // Si no, l'anem a buscar i el guardem per a la pròxima vegada
      return fetch(event.request).then((res) => {
        if (!res || res.status !== 200) return res;

        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, copy);
        });
        return res;
      }).catch(() => {
        // SI NO HI HA INTERNET i és una pàgina, tornem la home
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
