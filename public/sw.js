const CACHE_NAME = "carvey-v1";

const STATIC_ASSETS = [
  "/fonts/UKNumberPlate.ttf",
  "/fonts/USNumberPlate.ttf",
  "/icons/Favicon.png",
  "/icons/Carvey-light.png",
  "/icons/Carvey-dark.png",
  "/icons/Carvey-plate-front.png",
  "/icons/Carvey-plate-rear.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Skip API routes and auth/data-mutating requests entirely
  if (url.pathname.startsWith("/api/") || request.method !== "GET") return;

  // Next.js static chunks are content-hashed — cache forever
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Known public static assets — cache-first
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
    return;
  }

  // Navigation — network-first with offline fallback to cached version
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});
