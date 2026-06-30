/**
 * Service Worker for Patient Outcome push notifications.
 *
 * Responsibilities:
 *  1. Receive push events and display a browser notification.
 *  2. Handle notification click — open the deep-link URL from the payload.
 *
 * This service worker is kept intentionally minimal. No caching or offline
 * strategy is implemented here; that should be added via a separate Workbox
 * configuration if needed.
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    icon?: string;
  } = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Patient Outcome", body: event.data.text() };
  }

  const title = payload.title ?? "Patient Outcome";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    tag: payload.tag ?? "patientoutcome",
    icon: payload.icon ?? "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: payload.url ?? "/" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url: string = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab that matches the URL if possible
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return (client as WindowClient).focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
