const VERSION = "v4";
const SHARE_CACHE = "share-target-cache-v4";

self.addEventListener("install", e => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHARE_CACHE).map(k => caches.delete(k)));
    await clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  if (url.pathname === "/share-target" && e.request.method === "POST") {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const audio = formData.get("audio");
        if (audio) {
          const buf  = await audio.arrayBuffer();
          const blob = new Blob([buf], { type: audio.type || "audio/mpeg" });
          const resp = new Response(blob, {
            headers: {
              "Content-Type": audio.type || "audio/mpeg",
              "X-File-Name": encodeURIComponent(audio.name || "enregistrement.m4a"),
            },
          });
          const cache = await caches.open(SHARE_CACHE);
          await cache.put("/shared-audio", resp);
        }
      } catch (err) {
        console.error("SW share-target error:", err);
      }
      // Rediriger vers la page avec paramètre
      return Response.redirect("/?shared=1&t=" + Date.now(), 303);
    })());
    return;
  }

  // Servir /shared-audio depuis le cache
  if (url.pathname === "/shared-audio") {
    e.respondWith((async () => {
      const cache = await caches.open(SHARE_CACHE);
      const cached = await cache.match("/shared-audio");
      if (cached) {
        await cache.delete("/shared-audio");
        return cached;
      }
      return new Response("Not found", { status: 404 });
    })());
    return;
  }

  // Tout le reste : réseau direct
  e.respondWith(fetch(e.request).catch(() => new Response("Offline")));
});
