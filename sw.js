// Motion Blueprint — Service Worker
// Bump CACHE_VERSION on every deploy that should reach visitors immediately.
// Network-first: always try the live network copy first, so page updates
// show up on next load without the user needing to clear any cache.
// Falls back to the cached copy only when there's no network (offline use).
const CACHE_VERSION = 'v14';
const CACHE_NAME = `motion-blueprint-${CACHE_VERSION}`;

// Everything the app needs to be fully usable offline immediately after
// install — not just the HTML shell. Icons and the manifest matter
// especially for the packaged Android app (via PWABuilder): the OS reads
// these to render the home-screen icon and app info, and a TWA should
// never show a broken icon or fail a manifest check just because the
// device happened to be offline the moment it was needed.
const PRECACHE_URLS = [
  './',
  './index.html',
  './js/session-utils.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

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
    // { cache: 'no-store' } is essential here, not optional: without it,
    // this fetch() call is itself subject to the browser's ordinary HTTP
    // cache — including GitHub Pages' "Cache-Control: max-age=600" header
    // — and could silently return a stale response without ever reaching
    // the network. This is a *separate* cache layer from the one that
    // "updateViaCache: 'none'" (set on the page's registration call)
    // bypasses; that option only affects how the browser fetches sw.js
    // itself, not how the worker's own fetch handler behaves. Both are
    // needed for updates to always reach the visitor.
    fetch(event.request, { cache: 'no-store' })
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
