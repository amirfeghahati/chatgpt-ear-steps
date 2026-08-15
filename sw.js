const CACHE_NAME = "earsteps-pwa-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./logic.js",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  let networkResponse;

  try {
    networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = request.mode === "navigate" ? "./index.html" : request;
      await cache.put(cacheKey, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    // A cached response below keeps the installed app available offline.
  }

  const cacheKey = request.mode === "navigate" ? "./index.html" : request;
  const cachedResponse = await caches.match(cacheKey);
  if (cachedResponse) return cachedResponse;
  if (networkResponse) return networkResponse;

  return Response.error();
}
