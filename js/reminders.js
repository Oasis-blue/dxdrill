/* Account-linked Web Push study reminder controls. Permission is requested only after an explicit button tap. */
(function () {
  var DX = window.DX;
  var R = { loaded: false, loading: false, prefs: null, subscription: null, error: "", busy: false };
  DX.reminders = R;
  var FN = "https://dkullruinrnwjmhlxlpl.supabase.co/functions/v1/study-reminders";
  function client() { return DX.cloud && DX.cloud.sb && DX.cloud.user ? DX.cloud.sb : null; }
  function repaint() {
    if ((location.hash || "").slice(1) === "account" && DX.account && DX.cloud && DX.cloud.app) DX.account.render(DX.cloud.app);
  }
  function defaults() {
    var zone = "Africa/Lagos";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || zone; } catch (e) {}
    return { enabled: false, local_time: "19:00", timezone: zone, days_of_week: [1,2,3,4,5,6,7], quiet_start: null, quiet_end: null, reminder_type: "daily_practice" };
  }
  R.load = function (force) {
    var sb = client();
    if (!sb || R.loading || (R.loaded && !force)) return Promise.resolve();
    R.loading = true;
    return sb.from("study_reminder_preferences").select("*").maybeSingle().then(function (res) {
      R.loading = false; R.loaded = true;
      if (res.error) { R.error = "Reminder settings are not available yet. The database update-24.sql must be run first."; return; }
      R.prefs = res.data || defaults();
      return sb.from("study_push_subscriptions").select("id").then(function (s) {
        R.subscription = !s.error && s.data && s.data.length > 0;
      });
    }).catch(function () { R.loading = false; R.loaded = true; R.error = "Could not load reminder settings. Check your connection."; });
  };
  function b64url(s) {
    var p = "=".repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function authHeaders() {
    return client().auth.getSession().then(function (r) {
      var token = r.data && r.data.session && r.data.session.access_token;
      if (!token) throw new Error("Your session has expired. Sign in again.");
      return { "Authorization": "Bearer " + token, "Content-Type": "application/json", "apikey": "sb_publishable_azxnKz5UEbn3yuZjyqTZWQ_oYaOs92Z" };
    });
  }
  R.save = function () {
    var sb = client(); if (!sb) return Promise.reject(new Error("Sign in to save reminder settings."));
    var time = document.getElementById("rem-time"), zone = document.getElementById("rem-zone");
    var days = Array.prototype.slice.call(document.querySelectorAll("[data-rem-day]:checked")).map(function (x) { return Number(x.value); });
    if (!days.length) return Promise.reject(new Error("Choose at least one day."));
    var p = R.prefs || defaults();
    var row = { user_id: DX.cloud.user.id, enabled: !!p.enabled, local_time: time ? time.value : p.local_time,
      timezone: zone ? zone.value.trim() : p.timezone, days_of_week: days, reminder_type: "daily_practice" };
    if (!row.local_time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.local_time)) return Promise.reject(new Error("Choose a valid reminder time."));
    if (!row.timezone || row.timezone.length > 80) return Promise.reject(new Error("Enter a valid time zone."));
    return sb.from("study_reminder_preferences").upsert(row, { onConflict: "user_id" }).then(function (res) {
      if (res.error) throw res.error;
      R.prefs = row; R.error = ""; return row;
    });
  };
  R.enable = function () {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return Promise.reject(new Error("Push reminders are not supported by this browser."));
    }
    if (!window.isSecureContext) return Promise.reject(new Error("Push reminders require a secure HTTPS connection."));
    if (!client()) return Promise.reject(new Error("Sign in before enabling reminders."));
    R.busy = true;
    return authHeaders().then(function (headers) {
      return fetch(FN, { method: "GET", headers: headers });
    }).then(function (res) {
      if (!res.ok) throw new Error("The reminder service is not deployed yet. Try again after setup is complete.");
      return res.json();
    }).then(function (data) {
      if (!data || !data.publicKey) throw new Error("The reminder service has no public push key configured yet.");
      return navigator.serviceWorker.register("./sw.js").then(function (reg) {
        return reg.pushManager.getSubscription().then(function (existing) {
          if (existing) return existing.unsubscribe().then(function () { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64url(data.publicKey) }); });
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64url(data.publicKey) });
        });
      });
    }).then(function (sub) {
      return authHeaders().then(function (headers) {
        return fetch(FN, { method: "POST", headers: headers, body: JSON.stringify({ action: "subscribe", subscription: sub.toJSON(), userAgent: navigator.userAgent.slice(0, 500) }) });
      }).then(function (res) { if (!res.ok) throw new Error("Could not save this device's push subscription."); return sub; });
    }).then(function () {
      R.subscription = true; R.busy = false; R.error = "";
      if (DX.toast) DX.toast("Study reminders enabled on this device.");
      repaint();
    }).catch(function (e) { R.busy = false; R.error = e.message || "Could not enable reminders."; repaint(); throw e; });
  };
  R.disable = function () {
    var sb = client(); if (!sb) return Promise.reject(new Error("Sign in to manage reminders."));
    R.busy = true;
    return navigator.serviceWorker.getRegistration("./").then(function (reg) {
      return reg && reg.pushManager ? reg.pushManager.getSubscription() : null;
    }).then(function (sub) {
      var remove = sub ? sub.endpoint : null;
      return (sub ? sub.unsubscribe() : Promise.resolve()).then(function () {
        return remove ? sb.from("study_push_subscriptions").delete().eq("endpoint", remove) : null;
      });
    }).then(function () {
      R.subscription = false; R.busy = false;
      return sb.from("study_reminder_preferences").upsert({ user_id: DX.cloud.user.id, enabled: false }, { onConflict: "user_id" });
    }).then(function (res) {
      if (res && res.error) throw res.error;
      if (DX.toast) DX.toast("Study reminders turned off on this device.");
      repaint();
    }).catch(function (e) { R.busy = false; R.error = e.message || "Could not disable reminders."; repaint(); throw e; });
  };
  R.html = function () {
    var p = R.prefs || defaults(), days = [[1,"Mon"],[2,"Tue"],[3,"Wed"],[4,"Thu"],[5,"Fri"],[6,"Sat"],[7,"Sun"]];
    var checks = days.map(function (d) {
      return '<label class="rem-day"><input type="checkbox" data-rem-day value="' + d[0] + '"' + (p.days_of_week.indexOf(d[0]) >= 0 ? " checked" : "") + '> ' + d[1] + '</label>';
    }).join("");
    var status = R.loading ? "Loading your settings…" : R.error ? R.error : R.subscription ? "This device is subscribed to push reminders." : "No device is subscribed yet.";
    return '<section class="section stack"><h2>Study reminders</h2><p class="hint">Choose when DxDrill should gently remind you to practise. Reminders are optional and can be switched off at any time.</p>' +
      '<p class="hint">' + status + '</p>' +
      '<div class="field"><label class="label" for="rem-time">Reminder time</label><input id="rem-time" type="time" value="' + p.local_time + '"></div>' +
      '<div class="field"><label class="label" for="rem-zone">Time zone (IANA)</label><input id="rem-zone" type="text" maxlength="80" value="' + p.timezone + '" placeholder="Africa/Lagos"></div>' +
      '<div class="field"><span class="label">Days</span><div class="rem-days">' + checks + '</div></div>' +
      '<div class="row tight"><button class="btn small" data-act="remsave"' + (R.busy ? " disabled" : "") + '>Save schedule</button>' +
      (R.subscription ? '<button class="btn small ghost" data-act="remoff"' + (R.busy ? " disabled" : "") + '>Turn off on this device</button>' : '<button class="btn small primary" data-act="remon"' + (R.busy ? " disabled" : "") + '>Enable notifications on this device</button>') + '</div>' +
      '<p class="hint">Your browser will ask permission only when you press Enable. On iPhone/iPad, add DxDrill to your Home Screen first. Push delivery also depends on your browser and device notification settings.</p></section>';
  };
})();