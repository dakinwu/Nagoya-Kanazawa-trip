const CACHE_NAME = 'nagoya-hokuriku-trip-v17-2027-v6-no-print';
const CORE = ['./','./index.html','./manifest.webmanifest','./social-preview.png','./icons/icon-192.png','./icons/icon-512.png','./cloud-sync.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isCloudConfig = /\/cloud-config\.js$/.test(url.pathname);

  // cloud-config.js is environment configuration: online requests must bypass both
  // the browser HTTP cache and old PWA caches. Keep only the latest successful copy
  // as an offline fallback.
  if (isCloudConfig) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./cloud-config.js', copy));
          }
          return response;
        })
        .catch(() => caches.match('./cloud-config.js'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(response => response || caches.match('./index.html')))
  );
});
