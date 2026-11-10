const CACHE_NAME = "jbcs-shell-v2";
const OFFLINE_URL = "/offline.html";
const OFFLINE_FINANCE_ROUTE = "/workspace/finance/expenses";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([OFFLINE_URL, "/jbcs-icon.svg"]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("jbcs-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Do not cache API responses or financial data. Cache only the expenses page shell
// after a successful authenticated visit, plus immutable Next.js static assets.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && url.pathname === OFFLINE_FINANCE_ROUTE && response.url.includes(OFFLINE_FINANCE_ROUTE)) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        if (url.pathname === OFFLINE_FINANCE_ROUTE) {
          const cached = await cache.match(request);
          if (cached) return cached;
        }
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (url.pathname === "/jbcs-icon.svg" || url.pathname === OFFLINE_URL) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
