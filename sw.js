// SW minimal — uniquement pour PWA installable, aucun cache d'app
const SHARE_CACHE = "share-v5";

self.addEventListener("install", e => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // Vider TOUS les caches sauf share
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHARE_CACHE).map(k => caches.delete(k)));
    await clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Share target POST
  if (url.pathname === "/share-target" && e.request.method === "POST") {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const audio = fd.get("audio");
        if (audio) {
          const buf = await audio.arrayBuffer();
          const cache = await caches.open(SHARE_CACHE);
          await cache.put("/pending-audio", new Response(buf, {
            headers: {
              "Content-Type": audio.type || "audio/m4a",
              "X-Name": encodeURIComponent(audio.name || "enregistrement.m4a"),
            }
          }));
        }
      } catch(e) { console.error(e); }
      return Response.redirect("/?s=1&t=" + Date.now(), 303);
    })());
    return;
  }

  // Servir le fichier en attente
  if (url.pathname === "/pending-audio") {
    e.respondWith((async () => {
      const cache = await caches.open(SHARE_CACHE);
      const r = await cache.match("/pending-audio");
      if (r) { await cache.delete("/pending-audio"); return r; }
      return new Response("", { status: 404 });
    })());
    return;
  }

  // TOUT le reste : réseau direct, jamais de cache
  e.respondWith(fetch(e.request));
});
