const CACHE_NAME = 'topic-earth-shell-v16-fever-model-fallback';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './site.webmanifest',
  './assets/logo/local/favicon.svg',
  './assets/logo/local/earth-128.svg',
  './assets/logo/local/brand-header.svg',
  './assets/logo/local/pwa-192.png',
  './assets/logo/local/pwa-512.png',
  './shared/topic-favicon.js?v=earth-clock-20261008'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
