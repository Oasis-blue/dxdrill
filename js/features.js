/* Feature switches: the admin shows or hides features from students (Account > admin). The admin always sees everything. */
(function () {
  var DX = window.DX, esc = DX.esc;
  /* What to show if the switches cannot be loaded (first visit while offline, or the online part is paused). */
  var FALLBACK = { cards: true, polls: true, competitions: false, live: false, debates: false };
  var LIST = [
    ["cards", "Flashcards", "Recall mode inside Play."],
    ["polls", "Polls", "The Polls page in the menu."],
    ["competitions", "Challenges", "Ranked quizzes that stay open for a few days."],
    ["live", "Live quiz", "Live rooms with a join code."],
    ["debates", "Debates", "Claims with sides, reasons and reactions."]
  ];
  var F = { map: DX.store.get("dx.features", null) || FALLBACK, loaded: false, err: "", busy: false };
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
      }).join("") + '</section><p class="hint">Practice, Hall mode, Leaderboards, accounts, How to start, Feedback and About are always on.</p></div>';
  }
  function onClick(e) {
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
