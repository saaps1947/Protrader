// PRO Trader service worker — receives Web Push events and handles taps on
// the resulting notification. Deliberately minimal: this app has no offline
// requirement, so there's no fetch-caching logic here, only what push
// notifications actually need.

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function(event) {
  var data = { title: "PRO Trader", body: "New update", url: "/", tag: "protrader-signal" };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    // Malformed or missing payload — fall back to the generic message above
    // rather than letting the whole push event silently fail to show anything.
  }

  var options = {
    body: data.body || "",
    icon: undefined, // uses the PWA's own icon by default on iOS
    badge: undefined,
    data: { url: data.url || "/" },
    // FIX: flagged in an independent review — this used one hardcoded tag
    // for every notification, meaning a second HIGH signal for a
    // DIFFERENT symbol would silently replace the first one before the
    // user ever saw it, since same-tag notifications collapse into one on
    // the lock screen. The server now sends a per-symbol tag
    // ("protrader-signal-NIFTY" vs "protrader-signal-BANKNIFTY"), so
    // different symbols no longer overwrite each other — while repeat
    // signals for the SAME symbol still correctly collapse into one,
    // rather than stacking into noise. Falls back to the old shared tag
    // only if a payload somehow arrives without one.
    tag: data.tag || "protrader-signal",
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "PRO Trader", options)
  );
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      // If the app is already open in some window, focus that instead of
      // opening a duplicate — standard PWA notification-click behavior.
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
