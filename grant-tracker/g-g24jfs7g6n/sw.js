// One Tree Locale Grants — offline support. Bump VERSION when the app changes.
const VERSION = 'otl-grants-v3';
const SHELL = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Any page inside the app opens the app. Try the network first so updates arrive;
  // only keep a good copy (never an error page), and fall back to the saved copy if offline or on an error.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res;
      }
      return caches.match('index.html').then(hit => hit || res);
    }).catch(() => caches.match('index.html')));
    return;
  }
  // The fortnightly search results: always try the network so new finds show up; saved copy only when offline.
  if (url.origin === location.origin && url.pathname.endsWith('/found-grants.json')) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  // Icons, manifest and Google Fonts: use the saved copy, fetch and save it the first time.
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
