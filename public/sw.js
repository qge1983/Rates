const CACHE_NAME = "qaiser-rates-shell-v1";
const APP_SCOPE = new URL(self.registration.scope);
const APP_ROOT = APP_SCOPE.href;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(new Request(APP_ROOT, { cache: "reload" }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_SCOPE.pathname)) return;

  // Keep rate data fresh; only cache the app shell for offline launch.
  if (url.pathname.endsWith(".xlsx") || url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_ROOT, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(APP_ROOT)) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname === new URL("logo.png", APP_SCOPE).pathname ||
      url.pathname === new URL("manifest.webmanifest", APP_SCOPE).pathname) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) (await caches.open(CACHE_NAME)).put(request, response.clone());
      return response;
    })());
  }
});
