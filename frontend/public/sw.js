const VERSION = "v7";
const STATIC_CACHE = `nivasafe-static-${VERSION}`;
const RUNTIME_CACHE = `nivasafe-runtime-${VERSION}`;
const SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/brand/nivasafe-icon.png",
  "/brand/nivasafe-en.png",
  "/brand/nivasafe-fa.png",
];

function isCacheableAsset(request) {
  return ["script", "style", "image", "font", "manifest"].includes(request.destination) || new URL(request.url).pathname.startsWith("/assets/");
}

async function cacheResponse(cacheName, request, response) {
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await cacheResponse(RUNTIME_CACHE, request, await fetch(request));
  } catch {
    return (await caches.match(request)) || (await caches.match("/offline.html"));
  }
}

async function fetchAndCacheAsset(request) {
  try {
    return await cacheResponse(STATIC_CACHE, request, await fetch(request));
  } catch {
    return (await caches.match(request)) || (await caches.match("/offline.html"));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/docs")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isCacheableAsset(request)) {
    const network = fetchAndCacheAsset(request);
    event.waitUntil(network.catch(() => undefined));
    event.respondWith(caches.match(request).then((cached) => cached || network).catch(() => caches.match("/offline.html")));
    return;
  }

  event.respondWith(networkFirst(request));
});
