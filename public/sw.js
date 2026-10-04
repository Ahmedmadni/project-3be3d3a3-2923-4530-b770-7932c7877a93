const CACHE = "health-indicator-static-v3";
const STATIC_SHELL = [
  "/offline.html",
  "/manifest.webmanifest",
  "/pwa-192.png",
  "/pwa-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("supabase")) return;

  // Never cache navigation HTML. Pages may contain personalized health UI.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }

  // Cache only static presentation assets. No API or health-data responses.
  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  // Deliberately ignore push payload content. Health reminders displayed by the
  // operating system must stay generic and must not expose medication names,
  // doses, diagnoses, measurements, or other sensitive health information.
  event.waitUntil(
    self.registration.showNotification("مؤشر صحي", {
      body: "لديك تذكير صحي مسجل. افتح التطبيق لمراجعته.",
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      tag: "health-indicator-reminder",
      renotify: false,
      data: { url: "/journal" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      async (clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            if ("navigate" in client) await client.navigate("/journal");
            return client.focus();
          }
        }
        return self.clients.openWindow("/journal");
      },
    ),
  );
});

