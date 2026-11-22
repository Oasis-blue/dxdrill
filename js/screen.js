/* Big screen for a live room: open it on the projector with #screen?c=CODE. It only watches. It never shows the answer before the reveal. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null, L = ["A", "B", "C", "D"];
  var S = { code: "", st: null, err: "", deadline: 0, startAt: 0, sig: "", poll: null, tick: null, busy: false };
  function codeFromHash() { var m = /[?&]c=([A-Za-z0-9]+)/.exec(location.hash || ""); return m ? m[1].toUpperCase() : ""; }
  function siteUrl() { return location.origin + location.pathname.replace(/index\.html$/, ""); }
  function stop() { if (S.poll) clearTimeout(S.poll); if (S.tick) clearInterval(S.tick); S.poll = S.tick = null; }
  function render(a) {
    app = a; stop(); document.body.classList.add("bigscreen");
    S.code = codeFromHash(); S.st = null; S.err = ""; S.sig = ""; paint();
    if (S.code) { fetchState(); S.tick = setInterval(tick, 250); }
  }
  function leave() { stop(); document.body.classList.remove("bigscreen"); }
  function fetchState() {
    var c = DX.cloud;
    if (!c || !c.ok || !c.sb) { S.err = "The online part is not reachable. Check the internet connection."; paint(); schedule(4000); return; }
    c.sb.rpc("room_screen", { p_code: S.code }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) { S.err = "No room with code " + S.code + ". Check the code."; S.st = null; paint(); schedule(5000); return; }
      S.err = ""; apply(r.data); schedule(1500 + Math.random() * 700);
    }).catch(function () { S.err = "Could not reach the room. Trying again…"; paint(); schedule(4000); });
  }
  function schedule(ms) { if (S.poll) clearTimeout(S.poll); S.poll = setTimeout(function () { if ((location.hash || "").indexOf("#screen") === 0) fetchState(); }, ms); }
  function apply(s) {
    var now = Date.now();
    S.startAt = now + (Number(s.lead_left) || 0) * 1000;
    S.deadline = now + (Number(s.secs_left) || 0) * 1000;
    var sig = [s.status, s.cur_idx, s.players, s.answered, (s.top || []).map(function (x) { return x.score; }).join(","), (s.option_counts || []).join(","), (s.team_counts || []).join(","), JSON.stringify(s.teams || "")].join("|");
    S.st = s;
    if (sig !== S.sig) { S.sig = sig; paint(); } else tick();
  }
  function secsHtml(n) { return String(Math.max(0, Math.ceil(n))); }
  function tick() {
    var s = S.st; if (!s) return;
    var t = document.getElementById("bs-timer"), now = Date.now();
    if (s.status === "question") {
      var lead = S.startAt > now, left = lead ? (S.startAt - now) / 1000 : (S.deadline - now) / 1000;
      if (t) { t.textContent = secsHtml(left); t.className = "bs-timer" + (!lead && left <= 5 ? " low" : "") + (lead ? " lead" : ""); }
      var g = document.getElementById("bs-lead"); if (g) { var inLead = lead; if (g.getAttribute("data-lead") === "1" && !inLead) paint(); }
    }
  }
  function boardHtml(top) {
    if (!top || !top.length) return "";
    return '<ol class="bs-board">' + top.map(function (x, i) { return '<li><span class="bs-rank">' + (i + 1) + '</span><span class="bs-nm">' + esc(x.name) + '</span><b>' + x.score + '</b></li>'; }).join("") + '</ol>';
  }
  var TC = ["#c0392b", "#2c6fbb", "#1b7f4a", "#c26a10", "#7b4bb3", "#14808a"];
  function teamsHtml(teams) {
    if (!teams || !teams.length) return "";
    return '<div class="bs-teams">' + teams.map(function (t) { return '<div class="bs-team" style="border-color:' + TC[t.team - 1] + '"><span style="color:' + TC[t.team - 1] + '">\u25CF ' + esc(t.name) + '</span><b>' + t.total + '</b></div>'; }).join("") + '</div>';
  }
  function view() {
    var s = S.st;
    if (!S.code) return '<div class="bs-center"><h1>Big screen</h1><p>Type the room code to show that room here.</p><div class="row"><input id="bs-code" maxlength="8" autocomplete="off" placeholder="CODE" style="font-size:28px;text-transform:uppercase;width:9em"><button class="btn primary" data-act="bsgo">Show</button></div></div>';
    if (S.err && !s) return '<div class="bs-center"><h1>' + esc(S.err) + '</h1></div>';
    if (!s) return '<div class="bs-center"><h1>Loading…</h1></div>';
    var site = esc(siteUrl().replace(/^https?:\/\//, ""));
    if (s.status === "lobby") {
      return '<div class="bs-center"><p class="bs-eyebrow">' + esc(s.name) + '</p><p class="bs-how">Open <b>' + site + '</b>, tap <b>Play</b>, then <b>Live quiz</b>, and type</p><div class="bs-code" aria-label="Room code">' + esc(s.code) + '</div>' +
        '<p class="bs-big">' + s.players + ' joined</p>' + (s.n_teams ? '<p class="bs-teamcounts">' + (s.team_counts || []).map(function (c, i) { return '<span style="color:' + TC[i] + '">\u25CF ' + c + '</span>'; }).join("  ") + '</p>' : "") + '<p class="bs-wait">Waiting for the host to start…</p></div>';
    }
    if (s.status === "finished") {
      return '<div class="bs-wrap"><p class="bs-eyebrow">' + esc(s.name) + '</p><h1 class="bs-title">Final results</h1>' + (s.n_teams ? teamsHtml(s.teams) : "") + boardHtml(s.top) + '</div>';
    }
    var head = '<p class="bs-eyebrow">' + esc(s.name) + ' · Question ' + (s.cur_idx + 1) + ' of ' + s.n + '</p>';
    var inLead = s.status === "question" && S.startAt > Date.now();
    if (inLead) return '<div class="bs-center" id="bs-lead" data-lead="1">' + head + '<p class="bs-big">Get ready</p><div class="bs-timer lead" id="bs-timer">3</div></div>';
    var opts = "";
    if (s.q_options) {
      var cnt = s.option_counts || [];
      opts = '<div class="bs-opts">' + s.q_options.map(function (o, i) {
        var cls = "bs-opt" + (s.status === "reveal" && s.right_answer === i ? " right" : s.status === "reveal" && s.right_answer != null ? " dim" : "");
        return '<div class="' + cls + '"><span class="bs-k">' + L[i] + '</span><span class="bs-t">' + esc(o) + '</span>' + (s.status === "reveal" && cnt.length ? '<b class="bs-c">' + (cnt[i] || 0) + '</b>' : "") + '</div>';
      }).join("") + '</div>';
    }
    var meta = s.status === "question" ? '<div class="bs-meta"><div class="bs-timer" id="bs-timer">' + secsHtml((S.deadline - Date.now()) / 1000) + '</div><p>' + s.answered + (s.q_kind === "describe" ? " team" + (s.answered === 1 ? "" : "s") + " done" : " of " + s.players + " answered") + '</p></div>' : "";
    var after = s.status === "reveal" ? (s.explain ? '<p class="bs-explain">' + esc(s.explain) + '</p>' : "") + (s.n_teams ? teamsHtml(s.teams) : "") + boardHtml(s.top) : "";
    return '<div class="bs-wrap">' + head + '<h1 class="bs-q" style="white-space:pre-line">' + esc(s.q_text) + '</h1>' + opts + meta + after + '</div>';
  }
  function paint() {
    if (!app) return;
    var keep = document.getElementById("bs-code"), v = keep ? keep.value : "";
    app.innerHTML = '<div class="bs">' + view() + '<button class="bs-fs" data-act="bsfs" aria-label="Full screen">\u26F6</button></div>';
    var k2 = document.getElementById("bs-code"); if (k2) { k2.value = v; if (v) k2.focus(); }
    tick();
  }
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "bsfs") { var el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () { }); }
    else if (a === "bsgo") { var v = (document.getElementById("bs-code").value || "").trim().toUpperCase(); if (v) location.hash = "#screen?c=" + v; }
  }
  function onKey(e) { if (e.key === "Enter" && document.getElementById("bs-code") && document.activeElement && document.activeElement.id === "bs-code") { onClick({ target: document.querySelector("[data-act=bsgo]") }); } }
  DX.screen = { render: render, onClick: onClick, onKey: onKey, leave: leave };
})();
