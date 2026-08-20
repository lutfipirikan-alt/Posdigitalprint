/* Sani Print POS — service worker (cache offline).
   Defensif: semua kegagalan cache jatuh kembali ke network biasa,
   sehingga SW tidak akan pernah membuat halaman gagal dimuat. */
const CACHE = "saniprint-v2";
const CORE = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        Promise.all(
          CORE.map((url) =>
            fetch(url, { cache: "no-store" })
              .then((res) => (res && res.ok ? c.put(url, res.clone()) : null))
              .catch(() => null)
          )
        )
      )
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => null)
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navigasi: network dulu, jatuh ke cache index.html saat offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          try {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/index.html", copy)).catch(() => null);
          } catch (_) { /* abaikan */ }
          return res;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then((hit) => hit || caches.match("/"))
            .then((hit2) => hit2 || Response.error())
        )
    );
    return;
  }

  // Aset: cache dulu, lalu isi cache dari network (gagal cache → tetap jalan)
  e.respondWith(
    caches
      .match(req)
      .then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            try {
              if (res.ok && req.url.startsWith(self.location.origin)) {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => null);
              }
            } catch (_) { /* abaikan */ }
            return res;
          })
      )
      .catch(() => fetch(req))
  );
});
