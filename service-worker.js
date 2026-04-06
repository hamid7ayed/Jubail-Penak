const CACHE_NAME = "penak-cache-v1";

const ASSETS = [
  "/Jubail-Penak/",
  "/Jubail-Penak/index.html",
  "/Jubail-Penak/styles.css",
  "/Jubail-Penak/app.js",
  "/Jubail-Penak/manifest.json",
  "/Jubail-Penak/icons/icon-192.png",
  "/Jubail-Penak/icons/icon-512.png"
];

// Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(cached => {
      return (
        cached ||
        fetch(req).catch(() => {
          if (req.destination === "document") {
            return caches.match("/Jubail-Penak/index.html");
          }
        })
      );
    })
  );
});
