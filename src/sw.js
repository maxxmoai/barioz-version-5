// Service worker : le site reste utilisable avec un réseau faible ou coupé (conditions du jour = dernière version connue).
// - /api/public : réseau d'abord (4 s), sinon dernière réponse en cache
// - pages : réseau d'abord (4 s), sinon cache, sinon accueil
// - /assets : cache d'abord, rafraîchi en arrière-plan
// Jamais en cache : /admin, le reste de l'API, tout ce qui n'est pas GET ou vient d'un autre site.
const V = 'bz-__V__';
const SHELL = ['/', '/conditions', '/foyer', '/acces', '/assets/css/site.css?v=__V__', '/assets/js/site.js?v=__V__', '/assets/fonts/bitter-var.woff', '/assets/fonts/dmsans-var.woff'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
async function networkFirst(req, ms) {
  const cache = await caches.open(V);
  try {
    const res = await Promise.race([fetch(req), timeout(ms)]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (req.mode === 'navigate' ? await cache.match('/') : undefined) || Response.error();
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(V);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;
  if (u.pathname.startsWith('/admin')) return;
  if (u.pathname === '/api/public' && !u.searchParams.has('fresh')) { e.respondWith(networkFirst(req, 4000)); return; }
  if (u.pathname.startsWith('/api/')) return;
  if (u.pathname.startsWith('/assets/')) { e.respondWith(cacheFirst(req)); return; }
  if (req.mode === 'navigate') e.respondWith(networkFirst(req, 4000));
});
