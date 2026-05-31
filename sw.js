// Version 3 — se désinstalle si obsolète
const VERSION = "v3";
const SHARE_CACHE = "share-target-cache-v3";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    // Supprimer tous les anciens caches
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

          const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
          for (const client of allClients) {
            client.postMessage({ type: "SHARED_AUDIO_READY" });
          }
        }
      } catch (err) {
        console.error("SW share-target error:", err);
      }
      return Response.redirect("/?shared=1", 303);
    })());
    return;
  }

  // Toujours aller chercher sur le réseau — jamais de cache pour l'app
  e.respondWith(fetch(e.request));
});
