const CACHE = 'bolt-kiosk-v3';
const SHELL = ['/', '/index.html', '/app.css', '/app.js', '/api.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete ALL old caches on activate
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Network first for API calls
  if (url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }

  // Network first for JS/CSS — ensures updates always show immediately
  if (url.endsWith('.js') || url.endsWith('.css')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache first for everything else (HTML, icons)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
