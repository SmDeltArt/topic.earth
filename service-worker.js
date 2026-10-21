const CACHE_NAME = 'topic-earth-shell-v46-firefox-webgl-fallback';
const APP_SHELL = [
  './lib/weather-models.mjs?v=weather-mesh-20261015',
  './assets/models/weather-symbols.glb?v=weather-mesh-20261015',
  './lib/weather-visuals.mjs?v=weather-terrain-20261015',
  './lib/terrain-measure.mjs?v=metres-20261016',
  './lib/meteo-realtime.js?v=weather-terrain-20261015',
  './',
  './assets/widgets/color/smart-color-picker.html',
  './assets/widgets/color/smart-color-picker.html?embed=overlay&v=scheme-20261015',
  './assets/widgets/color/smart-colorset.json',
  './assets/widgets/color/smart-color-picker.i18n.csv',
  './lib/story-color-picker.mjs?v=scheme-20261015',
  './lib/topic-story-content.mjs?v=story-media-20261013',
  './lib/topic-story-media.mjs?v=story-media-20261013',
  './lib/topic-story-labels.mjs?v=story-media-20261013',
  './lib/zip-content-scan.mjs?v=story-media-20261013',
  './lib/cyclone-data.mjs?v=cyclones-20261013',
  './lib/tropical-cyclones.mjs?v=cyclones-20261013',
  './lib/cyclone-visuals.mjs?v=cyclones-20261013',
  './index.html',
  './styles.css?v=settings-language-row-20261016',
  './site.webmanifest?v=transparent-20261016',
  './assets/logo/local/favicon.svg?v=earth-clock-20261012',
  './assets/logo/local/earth-128.svg',
  './assets/logo/local/favicon.ico?v=earth-clock-20261012',
  './assets/logo/local/apple-touch-180.png?v=earth-clock-20261012',
  './assets/logo/local/brand-header.svg',
  './assets/logo/local/pwa-192.png?v=transparent-20261015',
  './assets/logo/local/pwa-512.png?v=transparent-20261016',
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
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});


