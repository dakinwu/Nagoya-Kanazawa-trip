const CACHE = 'nagoya-hokuriku-pages-v19-gfqabD5c';
const CORE = ["./","./index.html","./manifest.webmanifest","./favicon.svg","./apple-touch-icon.png","./icon-192.png","./icon-512.png","./assets/index-Cf-qotPd.css","./assets/index-gfqabD5c.js","./assets/leaflet-src-DSN54bL0.js"];
const coreUrls = new Set(CORE.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => /^(nagoya-hokuriku-trip-|nagoya-hokuriku-pages-)/.test(key) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/cloud-config.js')) {
    event.respondWith(fetch(event.request, {cache:'no-store'}).then(response => { if(response.ok) {const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(new URL('./cloud-config.js',self.registration.scope),copy)));} return response; }).catch(async()=>await caches.match(new URL('./cloud-config.js',self.registration.scope)) || Response.error()));
    return;
  }
  const isHome = event.request.mode === 'navigate' && (url.pathname === new URL(self.registration.scope).pathname || url.pathname === new URL('./index.html',self.registration.scope).pathname);
  if (!isHome && !coreUrls.has(url.href)) return;
  event.respondWith(fetch(event.request).then(response=> {if(response.ok) {const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));} return response;}).catch(async()=>await caches.match(event.request) || (isHome ? await caches.match(new URL('./index.html',self.registration.scope)) : null) || Response.error()));
});
