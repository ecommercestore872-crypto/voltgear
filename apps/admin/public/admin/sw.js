self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const work = [
    self.registration.showNotification(data.title || "New order", {
      body: data.body || "",
      icon: "/admin/icons/icon-192.png",
      badge: "/admin/icons/icon-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      timestamp: Date.now(),
      data: { url: data.url },
    }),
  ];
  // Number on the home-screen icon (supported on iPhone home-screen apps, Android Chrome, desktop).
  if (typeof data.badge === "number" && self.navigator && self.navigator.setAppBadge) {
    work.push(self.navigator.setAppBadge(data.badge).catch(() => undefined));
  }
  event.waitUntil(Promise.all(work));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/orders?tab=new";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).pathname.startsWith("/admin"));
      if (open) return open.navigate(url).then((c) => (c || open).focus()).catch(() => open.focus());
      return self.clients.openWindow(url);
    }),
  );
});
