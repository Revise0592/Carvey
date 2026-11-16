// Carvey service worker: installable app shell, plus read-only offline access to pages you've
// opened recently. Bump VERSION when this file changes so old caches are dropped.
const VERSION = "v2";
const STATIC_CACHE = `carvey-static-${VERSION}`;
const PAGE_CACHE = `carvey-pages-${VERSION}`;
const MAX_PAGES = 60;
const OFFLINE_PAGE = "/offline.html";

const STATIC_ASSETS = [
  OFFLINE_PAGE,
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
  "/manifest.json"
];

// Pages that must never be kept on the device: downloads, sign-in and anything one-off.
const NEVER_CACHE = [/^\/settings\/(backup|export|import|restore)/, /^\/login/, /^\/setup/, /^\/uploads\//, /^\/calendar\//, /^\/api\//];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

async function trimPages() {
  const cache = await caches.open(PAGE_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PAGES)).map((key) => cache.delete(key)));
}

async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    // Arriving at the sign-in page means a sign-out or an expired session: forget saved pages so
    // they can't be read on this device without signing in again.
    if (url.pathname.startsWith("/login") || new URL(response.url).pathname.startsWith("/login")) {
      await caches.delete(PAGE_CACHE);
    } else if (response.ok && !response.redirected && !NEVER_CACHE.some((pattern) => pattern.test(url.pathname))) {
      const cache = await caches.open(PAGE_CACHE);
      await cache.put(request, response.clone());
      trimPages();
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: PAGE_CACHE, ignoreVary: true });
    return cached ?? (await caches.match(OFFLINE_PAGE)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  // Next.js static chunks are content-hashed: cache forever.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
    return;
  }

  // Pages: network first, falling back to the last copy seen while online.
  if (request.mode === "navigate") event.respondWith(handleNavigation(request, url));
});
