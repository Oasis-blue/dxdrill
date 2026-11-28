/* DxDrill service worker: lets the site open and run with no connection.
   Bump VERSION whenever you change files in js/, css/ or index.html so phones pick up the new code. */
var VERSION = "dxdrill-v14.38";
var IMG = "dxdrill-img";   /* pictures live in their own cache that is kept when VERSION changes, so a bad connection after an update does not lose them */
var SHELL = [
  "./", "index.html", "help.html", "checker.html", "tf-checker.html", "manifest.webmanifest", "css/style.css",
  "js/data.js", "js/streak.js", "js/truefalse.js", "js/nuggets.js", "js/media.js", "js/practice.js", "js/fx.js", "js/hall.js", "js/tips.js", "js/screen.js", "js/remote.js", "js/spotter.js", "js/features.js", "js/cloud.js", "js/reminders.js", "js/polls.js", "js/about.js", "js/start.js", "js/feedback.js", "js/comps.js", "js/rooms.js", "js/debates.js", "js/cards.js", "js/app.js",
  "data/curriculum.json", "data/manifest.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"
];
var CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
var NETWORK_WAIT = 1500; /* on a slow connection, use the saved copy after 4 seconds */

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (cache) {
    var shell = Promise.all(SHELL.map(function (u) { return cache.add(new Request(u, { cache: "reload" })).catch(function () {}); }));
    /* Every question and term file listed in data/manifest.json is saved too, so new topics need no change here. */
    var data = fetch("data/manifest.json", { cache: "reload" }).then(function (r) { return r.json(); }).then(function (m) {
      var urls = (m.questions || []).map(function (f) { return "data/questions/" + f + ".json"; })
        .concat((m.terms || []).map(function (f) { return "data/" + f + ".json"; }));
      return Promise.all(urls.map(function (u) { return cache.add(new Request(u, { cache: "reload" })).catch(function () {}); }));
    }).catch(function () {});
    /* The scripts and fonts from other sites are saved on a best-effort basis. */
    var cdn = Promise.all([
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap"
    ].map(function (u) { return fetch(u).then(function (r) { if (r.ok) return cache.put(u, r); }).catch(function () {}); }));
    return Promise.all([shell, data, cdn]);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== IMG; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function networkFirst(req) {
  return caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req, { cache: "no-cache" }).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      });
      if (!hit) {
        /* Nothing saved yet: wait for the network. For a page load that fails, show the saved app. */
        return net.catch(function () { return req.mode === "navigate" ? cache.match("index.html") : Response.error(); });
      }
      /* Something is saved: prefer fresh, but fall back to the saved copy when offline or slow. */
      return Promise.race([
        net.catch(function () { return hit; }),
        new Promise(function (resolve) { setTimeout(function () { resolve(hit); }, NETWORK_WAIT); })
      ]);
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(VERSION).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; });
      return hit || net;
    });
  });
}

/* Pictures: show the saved copy straight away and refresh it quietly in the background. */
function pictureCache(req) {
  return caches.open(IMG).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok) cache.put(req, res.clone()); return res; });
      if (hit) { net.catch(function () {}); return hit; }
      return net;
    });
  });
}


/* Push messages must always produce a visible notification (including on Safari). */
self.addEventListener("push", function (e) {
  var payload = { title: "A little DxDrill reminder", body: "A few practice questions can keep your learning moving.", url: "./#practice" };
  if (e.data) {
    try {
      var incoming = e.data.json();
      if (incoming && typeof incoming === "object") {
        if (typeof incoming.title === "string") payload.title = incoming.title.slice(0, 80);
        if (typeof incoming.body === "string") payload.body = incoming.body.slice(0, 180);
        if (typeof incoming.url === "string") payload.url = incoming.url;
      }
    } catch (err) {
      var plain = e.data.text();
      if (plain) payload.body = plain.slice(0, 180);
    }
  }
  var target;
  try {
    target = new URL(payload.url, self.registration.scope);
    if (target.origin !== self.location.origin) target = new URL("./#practice", self.registration.scope);
  } catch (err) {
    target = new URL("./#practice", self.registration.scope);
  }
  e.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    tag: "dxdrill-study-reminder",
    renotify: false,
    data: { url: target.href }
  }));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = new URL("./#practice", self.registration.scope).href;
  try {
    var requested = e.notification.data && e.notification.data.url;
    var parsed = new URL(requested, self.registration.scope);
    if (parsed.origin === self.location.origin) target = parsed.href;
  } catch (err) { }
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (new URL(list[i].url).origin === self.location.origin) {
        if ("navigate" in list[i]) return list[i].navigate(target).then(function (client) { return client ? client.focus() : list[i].focus(); });
        return list[i].focus();
      }
    }
    return clients.openWindow(target);
  }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.indexOf("/data/img/") > -1) { e.respondWith(pictureCache(req)); return; }
  if (url.origin === self.location.origin) { e.respondWith(networkFirst(req)); return; }
  if (CDN.test(req.url)) { e.respondWith(staleWhileRevalidate(req)); return; }
  /* anything else (Supabase accounts and leaderboards) goes straight to the network */
});
