const CACHE = "pv-maetis-v1";
const SHARE_CACHE = "share-target-cache";

self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));

// Intercepte le POST du share target Android
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  if (url.pathname === "/share-target" && e.request.method === "POST") {
    e.respondWith((async () => {
      try {
        const formData = await e.request.formData();
        const audio    = formData.get("audio");
        if (audio) {
          const cache = await caches.open(SHARE_CACHE);
          // Stocker le fichier comme réponse blob dans le cache
          const buf  = await audio.arrayBuffer();
          const blob = new Blob([buf], { type: audio.type || "audio/mpeg" });
          // On encode le nom dans un header custom
          const resp = new Response(blob, {
            headers: {
              "Content-Type": audio.type || "audio/mpeg",
              "X-File-Name": encodeURIComponent(audio.name || "enregistrement.m4a"),
            },
          });
          await cache.put("/shared-audio", resp);
        }
      } catch (err) {
        console.error("SW share-target error:", err);
      }
      // Rediriger vers la page principale
      return Response.redirect("/", 303);
    })());
    return;
  }

  // Pour tout le reste : réseau d'abord, cache en fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
