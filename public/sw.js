self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch handler is required for PWA installability criteria
  // We can just respond with the network request directly
  event.respondWith(fetch(event.request));
});
