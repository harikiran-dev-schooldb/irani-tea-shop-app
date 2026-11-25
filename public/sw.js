/* Irani Tea PWA — authenticated data is never cached by the service worker. */
const STATIC_CACHE = "irani-tea-static-v5";
const STATIC = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/irani-tea-banner.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC)).then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("irani-tea-") && key !== STATIC_CACHE)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache personal sessions, API/financial data, HTML navigations,
  // account flows, or mutable application endpoints.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/auth") ||
    url.pathname.startsWith("/callback") ||
    url.pathname.startsWith("/signin") ||
    url.pathname.startsWith("/signout")
  ) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match("/offline.html")) || Response.error()
      ),
    );
    return;
  }

  const isStatic = url.pathname.startsWith("/_next/static/") || STATIC.includes(url.pathname);
  if (!isStatic) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)));
      }
      return response;
    })),
  );
});
