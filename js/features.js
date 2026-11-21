/* Feature switches: the admin shows or hides features from students (Account > admin). The admin always sees everything. */
(function () {
  var DX = window.DX, esc = DX.esc;
  /* What to show if the switches cannot be loaded (first visit while offline, or the online part is paused). */
  var FALLBACK = { cards: true, polls: true, competitions: false, live: false, debates: false, friends: false };
  var LIST = [
    ["cards", "Flashcards", "Recall mode inside Play."],
    ["polls", "Polls", "The Polls page in the menu."],
    ["competitions", "Challenges", "Ranked quizzes that stay open for a few days."],
    ["live", "Live quiz", "Live rooms with a join code."],
    ["debates", "Debates", "Claims with sides, reasons and reactions."],
    ["friends", "Practice with friends", "Students can start their own small live rooms. Needs Live quiz to be open too if you want the Live page visible."]
  ];
  var SETTINGS = [["friend_max_players", "Players per friend room", 150], ["friend_active_rooms", "Friend rooms in play at once", 500], ["friend_rooms_per_day", "Rooms one student can make per day", 500]];
  var F = { settings: null, saved: "", map: DX.store.get("dx.features", null) || FALLBACK, loaded: false, err: "", busy: false };
  var app = null;
  function C() { return DX.cloud; }
  function isAdmin() { return !!(C() && C().profile && C().profile.is_admin); }
  DX.features = {
    list: LIST,
    on: function (k) { return isAdmin() || F.map[k] !== false && (F.map[k] === true || !!FALLBACK[k]); },
    visibleToStudents: function (k) { return F.map[k] === true || (F.map[k] === undefined && !!FALLBACK[k]); },
    load: function () {
      if (!C() || !C().sb) return;
      C().sb.rpc("site_features").then(function (r) {
        if (r.error || !r.data) return;
        var m = {}; r.data.forEach(function (x) { m[x.key] = x.enabled; });
        F.map = m; F.loaded = true; DX.store.set("dx.features", m);
        if (DX.features.onChange) DX.features.onChange();
      }).catch(function () { });
    },
    render: render, onClick: onClick, leave: function () { }
  };
  function repaint() { if ((location.hash || "") === "#features" && app) render(app); }
  function render(a) {
    app = a;
    if (!isAdmin()) { a.innerHTML = '<div class="wrap stack"><h1>Not available</h1><p class="lede">This page is for the admin.</p></div>'; return; }
    a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Admin</p><h1>Features</h1><p class="lede">Choose what students can see. You always see everything, so you can test a hidden feature on the real site. Changes show up for students the next time they open or reload DxDrill.</p></header>' +
      (F.err ? '<p class="note bad" role="alert">' + esc(F.err) + '</p>' : "") +
      '<section class="stack">' + LIST.map(function (x) {
        var on = F.map[x[0]] === true || (F.map[x[0]] === undefined && !!FALLBACK[x[0]]);
        return '<article class="card"><h2>' + esc(x[1]) + '</h2><p>' + esc(x[2]) + '</p><p><b>' + (on ? "Shown to students" : "Hidden from students") + '</b></p><button class="btn ' + (on ? "ghost" : "primary") + '" data-act="set" data-key="' + x[0] + '" data-on="' + (on ? "0" : "1") + '"' + (F.busy ? " disabled" : "") + '>' + (on ? "Hide" : "Show to students") + '</button></article>';
      }).join("") + '</section>' + settingsHtml() + '<p class="hint">Practice, Hall mode, Leaderboards, accounts, How to start, Feedback and About are always on.</p></div>';
  }
  function settingsHtml() {
    if (F.settings === null) { F.settings = {}; C().sb.rpc("admin_site_settings").then(function (r) { if (!r.error && r.data) { r.data.forEach(function (x) { F.settings[x.key] = x.val; }); F.settings.__ok = true; repaint(); } }); }
    if (!F.settings.__ok) return "";
    return '<section class="section stack"><h2>Practice with friends: limits</h2><p class="hint">These keep the free plan safe. Raise them slowly after you see how the pilot goes.</p>' +
      SETTINGS.map(function (s) { return '<div class="field"><label class="label" for="st-' + s[0] + '">' + esc(s[1]) + '</label><input type="number" id="st-' + s[0] + '" min="1" max="' + s[2] + '" value="' + esc(F.settings[s[0]]) + '"></div>'; }).join("") +
      '<div class="row tight"><button class="btn primary" data-act="savesettings"' + (F.busy ? " disabled" : "") + '>Save limits</button></div>' + (F.saved ? '<p class="note" role="status">' + esc(F.saved) + '</p>' : "") + '</section>';
  }
  function onClick(e) {
    var sv = e.target.closest ? e.target.closest("[data-act='savesettings']") : null;
    if (sv) {
      F.busy = true; F.saved = ""; F.err = ""; repaint();
      Promise.all(SETTINGS.map(function (s) { var el = document.getElementById("st-" + s[0]); var v = parseInt(el && el.value, 10); if (!v) return null; return C().sb.rpc("admin_set_setting", { p_key: s[0], p_val: v }).then(function (r) { if (r.error) throw r.error; F.settings[s[0]] = Math.min(v, s[2]); }); }))
        .then(function () { F.busy = false; F.saved = "Saved."; repaint(); })
        .catch(function () { F.busy = false; F.err = "That did not save. Run supabase/update-10.sql first, then try again."; repaint(); });
      return;
    }
    var t = e.target.closest ? e.target.closest("[data-act='set']") : null; if (!t) return;
    var key = t.getAttribute("data-key"), on = t.getAttribute("data-on") === "1";
    F.busy = true; F.err = ""; repaint();
    C().sb.rpc("admin_set_feature", { p_key: key, p_on: on }).then(function (r) {
      if (r.error) throw r.error; F.map[key] = on; DX.store.set("dx.features", F.map); F.busy = false; repaint(); if (DX.features.onChange) DX.features.onChange();
    }).catch(function (er) {
      F.busy = false; F.err = /schema cache|does not exist|site_features|admin_set_feature/i.test((er && er.message) || "") ? "Run supabase/update-9.sql in Supabase first." : "That did not save. Try again."; repaint();
    });
  }
})();
