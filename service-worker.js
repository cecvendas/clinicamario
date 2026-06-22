/* Clínica Mário — Service Worker V18.6
   Regra: não prender arquivo antigo em cache.
*/
const CACHE_NAME = 'clinica-mario-v195-lgpd-admin-logado';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const req = event.request;

  // HTML sempre pela rede primeiro para não voltar tela antiga.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // JS/CSS sempre pela rede primeiro, fallback cache só se estiver offline.
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => null);
        return response;
      })
      .catch(() => caches.match(req))
  );
});
