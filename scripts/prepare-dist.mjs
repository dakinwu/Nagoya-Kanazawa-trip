import { readFile, writeFile, readdir, mkdir, copyFile } from "node:fs/promises";

const assets = (await readdir("dist/assets")).filter(name => /\.(js|css)$/.test(name)).map(name => `./assets/${name}`);
const core = ["./", "./index.html", "./manifest.webmanifest", "./favicon.svg", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png", ...assets];
const version = (await readFile("dist/index.html", "utf8")).match(/assets\/index-([\w-]+)\.js/)?.[1] || "19";
const script = `const CACHE = 'nagoya-hokuriku-pages-v19-${version}';
const CORE = ${JSON.stringify(core)};
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
`;
await writeFile("dist/service-worker.js", script);
await writeFile("dist/.nojekyll", "");
// Leaflet's CSS import is flattened by Tailwind; preserve its relative image paths.
await mkdir("dist/assets/images", { recursive: true });
for (const name of ["layers.png", "layers-2x.png", "marker-icon.png", "marker-icon-2x.png", "marker-shadow.png"]) await copyFile(`node_modules/leaflet/dist/images/${name}`, `dist/assets/images/${name}`);
