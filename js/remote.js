/* Quizmaster phone for Hall mode: #remote?c=CODE. Shows the private answer and sends button taps to the main screen. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var S = { code: "", p: null, age: 0, err: "", poll: null, tick: null, at: 0, busy: false, lock: 0, sig: "" };
  function codeFromHash() { var m = /[?&]c=([A-Za-z0-9]+)/.exec(location.hash || ""); return m ? m[1].toUpperCase() : ""; }
  function stop() { clearTimeout(S.poll); clearInterval(S.tick); S.poll = S.tick = null; }
  function render(a) {
    app = a; stop(); S.code = codeFromHash(); S.p = null; S.err = ""; S.sig = ""; paint();
    if (S.code) { pull(); S.tick = setInterval(tick, 250); }
  }
  function leave() { stop(); }
  function sched(ms) { clearTimeout(S.poll); S.poll = setTimeout(function () { if ((location.hash || "").indexOf("#remote") === 0) pull(); }, ms); }
  function pull() {
    var c = DX.cloud;
    if (!c || !c.ok || !c.sb) { S.err = "The online part is not reachable. Check the internet connection."; paint(); sched(4000); return; }
    c.sb.rpc("hall_pull", { p_code: S.code }).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data) { S.err = "No linked screen with code " + S.code + ". Check the code, or link again on the main screen."; S.p = null; paint(); sched(5000); return; }
      S.err = ""; S.age = Number(r.data.age) || 0; S.at = Date.now() - S.age * 1000; S.pull = Date.now();
      var pl = r.data.payload, sig = JSON.stringify(pl, function (k, v) { return k === "left" && pl && pl.timer && pl.timer.run ? 0 : v; }) + (S.age > 25 ? "L" : "");
      S.p = r.data.payload; if (sig !== S.sig) { S.sig = sig; paint(); } else tick();
      sched(1300 + Math.random() * 400);
    }).catch(function () { S.err = "Could not reach the server. Trying again…"; paint(); sched(3000); });
  }
  function tick() {
    var p = S.p, t = document.getElementById("rm-timer"); if (!p || !p.timer || !t) return;
    var left = p.timer.left; if (p.timer.run) left = Math.max(0, left - Math.floor((Date.now() - S.at) / 1000));
    t.textContent = left; t.className = "rm-timer" + (left <= 5 && p.timer.run ? " low" : "");
  }
  function lost() { return S.p && (S.age + (Date.now() - S.pull) / 1000) > 25; }
  function itemHtml(it) {
    if (!it) return "";
    var h = "";
    if (it.term != null) {
      h += '<p class="rm-q">' + esc(it.term) + '</p>';
      if (it.forbidden) h += '<p class="hint">Cannot say: ' + esc(it.forbidden.join(", ") || "nothing listed") + '</p>';
      if (it.clues) h += '<ol>' + it.clues.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join("") + '</ol>';
      return h;
    }
    h += '<p class="hint">' + esc(it.sub || "") + '</p><p class="rm-q">' + esc(it.q) + '</p>';
    if (it.opts) h += it.opts.map(function (o) { return '<div class="rm-opt' + (o.ok ? " ok" : "") + '"><b>' + esc(o.k) + '</b><span>' + esc(o.t) + '</span></div>'; }).join("");
    h += '<div class="rm-ans"><b>Answer:</b> ' + esc(it.ans) + (it.also && it.also.length ? '<br><span class="hint">Also accept: ' + esc(it.also.join(", ")) + '</span>' : "") + '</div>';
    if (it.why) h += '<p class="hint">' + esc(it.why) + '</p>';
    return h;
  }
  function view() {
    if (!S.code) return '<div class="rm"><h1>Quizmaster phone</h1><p>Type the code shown on the main screen. <a href="#hall">Back to Hall mode</a></p><div class="row"><input id="rm-code" maxlength="8" autocomplete="off" placeholder="Code" aria-label="Code"><button class="btn" data-act="rmgo">Connect</button></div></div>';
    if (S.err && !S.p) return '<div class="rm"><h1>Quizmaster phone</h1><p class="note bad" role="status">' + esc(S.err) + '</p></div>';
    var p = S.p; if (!p) return '<div class="rm"><p>Connecting…</p></div>';
    var h = '<div class="rm"><p class="hint">Quizmaster phone · ' + esc(S.code) + ' · <a href="#hall">Leave</a></p>';
    if (lost()) h += '<p class="note bad rm-lost" role="status">Lost contact with the main screen. Check that it is still open and online.</p>';
    if (p.teams && p.teams.length) h += '<div class="rm-teams">' + p.teams.map(function (t, i) { return '<span class="rm-team' + (i === p.active ? " on" : "") + '">' + esc(t.n) + ' ' + esc(t.s) + '</span>'; }).join("") + '</div>';
    if (p.view !== "round" && p.view !== "roundend") { return h + '<p>Pick a round on the main screen. Questions and answers will appear here.</p></div>'; }
    h += '<h2>' + esc(p.round || "Round") + '</h2>';
    (p.heads || []).forEach(function (x) { h += '<p class="hint">' + esc(x) + '</p>'; });
    if (p.timer) h += '<div class="rm-timer" id="rm-timer">' + esc(p.timer.left) + '</div>';
    h += itemHtml(p.item);
    h += '<div class="rm-btns">' + (p.btns || []).map(function (b, i) { return '<button class="btn ' + esc(b.c || "") + '" data-act="rmcmd" data-i="' + i + '">' + esc(b.t) + '</button>'; }).join("") + '</div></div>';
    return h;
  }
  function paint() { if (app) { app.innerHTML = view(); tick(); } }
  function send(i) {
    var b = S.p && S.p.btns && S.p.btns[i], c = DX.cloud; if (!b || !c || !c.sb || Date.now() < S.lock) return;
    S.lock = Date.now() + 700;
    var btns = document.querySelectorAll(".rm-btns .btn"); Array.prototype.forEach.call(btns, function (x) { x.disabled = true; });
    setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll(".rm-btns .btn"), function (x) { x.disabled = false; }); }, 700);
    c.sb.rpc("hall_cmd", { p_code: S.code, p_cmd: { a: b.a, v: b.v, i: b.i } }).then(function () { setTimeout(pull, 600); }, function () { });
  }
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "rmgo") { var v = (document.getElementById("rm-code").value || "").trim().toUpperCase(); if (v) location.hash = "#remote?c=" + v; }
    else if (a === "rmcmd") send(Number(b.getAttribute("data-i")));
  }
  function onKey(e) { if (e.key === "Enter" && document.activeElement && document.activeElement.id === "rm-code") onClick({ target: document.querySelector("[data-act=rmgo]") }); }
  DX.remote = { render: render, onClick: onClick, onKey: onKey, leave: leave };
})();
