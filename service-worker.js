const CACHE_NAME = 'topic-earth-shell-v21-story-reader-review';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=story-reader-review-20261012',
  './site.webmanifest?v=earth-clock-20261012',
  './assets/logo/local/favicon.svg?v=earth-clock-20261012',
  './assets/logo/local/earth-128.svg',
  './assets/logo/local/favicon.ico?v=earth-clock-20261012',
  './assets/logo/local/apple-touch-180.png?v=earth-clock-20261012',
  './assets/logo/local/brand-header.svg',
  './assets/logo/local/pwa-192.png?v=earth-clock-20261012',
  './assets/logo/local/pwa-512.png?v=earth-clock-20261012',
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
