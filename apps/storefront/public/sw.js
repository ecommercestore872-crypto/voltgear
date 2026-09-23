// A minimal service worker to satisfy PWA installation requirements.
// This tells the mobile browser that the site works offline (conceptually), enabling the standard "Install App" banner.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through fetch to satisfy the PWA checks, without aggressively caching and breaking Next.js hydration
  event.respondWith(fetch(event.request));
});
