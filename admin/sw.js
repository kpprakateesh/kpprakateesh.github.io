/* ==========================================================================
   AGAM STUDIO — service worker
   --------------------------------------------------------------------------
   Caches the admin shell so the installed app opens quickly and still shows
   its interface on a patchy connection. Data, auth and uploads always go to
   the network — nothing private is stored in this cache.
   ========================================================================== */

const VERSION = "agam-admin-v1";
const SHELL = [
  "./",
  "./index.html",
  "./admin.css",
  "./admin.js",
  "./backend-firebase.js",
  "./backend-demo.js",
  "./manifest.webmanifest",
  "../assets/img/logo.jpg",
  "../assets/img/favicon.svg",
  "../assets/img/favicon-192.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("Admin shell cache skipped", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only handle our own files. Firebase, Google sign-in and fonts stay live.
  if (url.origin !== self.location.origin) return;

  // Never cache the Firebase config or anything with a query string.
  if (url.search) return;

  // The config is edited by hand and must always be fresh.
  if (url.pathname.endsWith("/assets/js/firebase-config.js")) return;

  // Navigations: network first, cached shell as the fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  // Static assets: cache first, refresh in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const live = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || live;
    })
  );
});
