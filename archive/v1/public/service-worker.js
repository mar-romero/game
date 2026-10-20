const CACHE_NAME = 'factory-wars-shell-v1';
const APP_ROOT = new URL('./', self.registration.scope);
const APP_SHELL = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.jpg',
  'icons/icon-512.jpg',
  'icons/apple-touch-icon.png',
  'game/presentation/styles/empire.css',
  'game/presentation/assets/empire-island-mobile.jpg',
  'game/adapters/web/config.js',
  'game/adapters/web/pwa-register.js',
  'game/domain/empire/catalog.js',
  'game/domain/empire/economy.js',
  'game/domain/empire/progression.js',
  'game/adapters/web/empire-controller.js'
].map((path) => new URL(path, APP_ROOT).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('factory-wars-shell-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => {
      if (url.pathname.endsWith('/arena.html')) return Response.error();
      return caches.match(new URL('index.html', APP_ROOT).href);
    }));
    return;
  }

  if (!['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return (await cache.match(request)) || Response.error();
    }
  })());
});
