/* P-500 Field Capture — service worker.
   Cache-first for a fully offline field tool. Bump CACHE_VERSION whenever any
   cached file changes, or the phone will keep serving the old copy.
   Note: no signal in the field is the normal case, so offline is the default
   path, not the fallback. */

const CACHE_VERSION = "p500-field-v1.0.0";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

// Other apps share this github.io address and its cache storage, so only this
// app's own old caches (p500-...) are cleared -- never another app's.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("p500-") && k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;               // never cache captures/POSTs
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          // Cache same-origin GETs opportunistically so subassets stick.
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));  // offline fallback to the app
    })
  );
});
