const CACHE_NAME = 'factory-wars-v2-shell-v1';
const APP_ROOT = new URL('./', self.registration.scope);
const APP_SHELL = [
  'index.html',
  'arena-v2.html',
  'factory-v2.html',
  'manifest.webmanifest',
  'icons/icon-192.jpg',
  'icons/icon-512.jpg',
  'icons/apple-touch-icon.png',
  'game/adapters/web/pwa-register.js',
  'game/adapters/web/arena-v2-controller.js',
  'game/adapters/web/factory-v2-controller.js',
  'game/application/arena-v2-bot.js',
  'game/domain/arena-v2/balance.js',
  'game/domain/arena-v2/match-engine.js',
  'game/domain/factory-v2/catalog.js',
  'game/domain/factory-v2/factory-engine.js',
  'game/domain/factory-v2/save-format.js',
  'game/presentation/styles/arena-v2.css',
  'game/presentation/styles/factory-v2.css'
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
        .filter((key) => key !== CACHE_NAME && (
          key.startsWith('factory-wars-shell-') || key.startsWith('factory-wars-v2-shell-')
        ))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cachedPage = await caches.match(request, { ignoreSearch: true });
      if (cachedPage) return cachedPage;
      if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
        return caches.match(new URL('index.html', APP_ROOT).href) || Response.error();
      }
      return Response.error();
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
