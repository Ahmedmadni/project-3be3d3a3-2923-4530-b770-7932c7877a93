// Messaging-only worker: preserve the existing push subscription and scope.
// Never cache navigation HTML, /api/ responses, or development modules.
// No fetch handler: request.mode === "navigate" and
// url.pathname.startsWith("/api/") always use the network, including
// url.pathname.includes("supabase").
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.allSettled(names.filter((name) => name.startsWith("health-indicator-static-")).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
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

