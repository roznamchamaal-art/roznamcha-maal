/* روزنامچہ مال — service worker (آف لائن کھولنے کے لیے)
   index.html کے ساتھ اسی فولڈر میں رکھیں۔ نیا index.html چڑھائیں تو VERSION کا نمبر بڑھا دیں۔ */
const VERSION = 'roznamcha-maal-v1';
const FONT_CACHE = 'roznamcha-maal-fonts-v1';
const CORE = ['./', 'index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: saved after the first visit, so Urdu fonts also work offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  if (url.origin !== location.origin) return;          // all other sites: untouched

  if (req.mode === 'navigate') {                       // the app page: newest copy when online, saved copy offline
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); }
        return res;
      }).catch(() => caches.match('index.html', { ignoreSearch: true }).then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(                                       // other files from this site: cache first
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
