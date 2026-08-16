// Motion Blueprint — Service Worker
// Bump CACHE_VERSION on every deploy that should reach visitors immediately.
// Network-first: always try the live network copy first, so page updates
// show up on next load without the user needing to clear any cache.
// Falls back to the cached copy only when there's no network (offline use).
const CACHE_VERSION = 'v2';
const CACHE_NAME = `motion-blueprint-${CACHE_VERSION}`;
const PRECACHE_URLS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  // Activate this new service worker as soon as it finishes installing,
  // instead of waiting for all old tabs to close.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  // Take control of any already-open tabs immediately, and clear out
  // caches from older versions so nothing stale lingers.
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests; let everything else pass through untouched.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Got a live copy — serve it, and refresh the cache for offline use.
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => {
        // No network (offline) — fall back to whatever we have cached.
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// Allows the page to ask the waiting service worker to activate immediately
// (used after detecting an update, so the new version takes over without
// requiring the user to fully close and reopen the app).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
