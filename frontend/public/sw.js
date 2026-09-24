const VERSION = "v14";
// One-time production migration: move already-open windows from the previous
// v13 shell so the updated site favicon cannot remain active in a stale client.
const FORCE_MIGRATION = VERSION === "v14";
const CACHE_PREFIX = "nivasafe-";
const STATIC_CACHE = `nivasafe-static-${VERSION}`;
const RUNTIME_CACHE = `nivasafe-runtime-${VERSION}`;
const SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon-white.svg",
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
  const cacheRequest = cacheRequestFor(request);
  try {
    return await cacheResponse(RUNTIME_CACHE, cacheRequest, await fetchWithTimeout(request));
  } catch {
    return (await caches.match(cacheRequest)) || (await caches.match("/offline.html"));
  }
}

async function fetchAndCacheAsset(request) {
  try {
    return await cacheResponse(STATIC_CACHE, request, await fetchWithTimeout(request));
  } catch {
    return (await caches.match(request)) || (await caches.match("/offline.html"));
  }
}

function fetchWithTimeout(request, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function cacheRequestFor(request) {
  if (request.mode !== "navigate") return request;
  const url = new URL(request.url);
  return new Request(`${url.origin}${url.pathname}`);
}

async function precacheShell() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(SHELL.map(async (url) => {
    try {
      const response = await fetchWithTimeout(new Request(url, { cache: "no-cache" }));
      if (response.ok) await cache.put(url, response);
    } catch {
      // An optional shell asset must not prevent the worker from installing.
    }
  }));
}

self.addEventListener("install", (event) => {
  if (FORCE_MIGRATION) self.skipWaiting();
  event.waitUntil(precacheShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
    if (!FORCE_MIGRATION) return;
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(clients.map((client) => {
      if (!client.url || typeof client.navigate !== "function") return Promise.resolve();
      return client.navigate(client.url).catch(() => undefined);
    }));
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname === "/sw.js" || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/docs") || url.pathname.startsWith("/uploads/")) return;

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
