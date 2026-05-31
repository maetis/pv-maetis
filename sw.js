const SHARE_CACHE = "share-target-cache-v2";

self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));

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

          // Notifier tous les clients ouverts via postMessage
          const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
          for (const client of allClients) {
            client.postMessage({ type: "SHARED_AUDIO_READY" });
          }
        }
      } catch (err) {
        console.error("SW share-target error:", err);
      }
      // Rediriger avec paramètre pour que l'app sache qu'un fichier attend
      return Response.redirect("/?shared=1", 303);
    })());
    return;
  }

  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
