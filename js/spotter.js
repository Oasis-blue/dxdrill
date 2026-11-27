/* Spotter (steeplechase): a run of stations, each a picture and a question for a fixed time, then it moves on by itself. No going back. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var LETTERS = ["A", "B", "C", "D"];
  var S = { view: "setup", sel: null, n: 10, secs: 45, bell: true, run: null, timer: null, note: "" };

  function pool() { return DX.questions.filter(function (q) { return q.image && q.options && q.options.length === 4 && typeof q.answer === "number"; }); }
  function topicName(id) { var t = DX.topicById && DX.topicById[id]; return t ? t.name : id; }
  function stationKey(q) { return q.visualStationId ? "station:" + q.visualStationId : "image:" + q.image; }
  function byStation(list) { var m = {}, keys = []; list.forEach(function (q) { var k = stationKey(q); if (!m[k]) { m[k] = []; keys.push(k); } m[k].push(q); }); return { map:m, keys:keys }; }
  function stop() { clearInterval(S.timer); S.timer = null; }

  function render(a) { app = a; stop(); if (S.view === "run" && !(S.run && !S.run.done)) S.view = "setup"; paint(); if (S.view === "run") tickStart(); }
  function leave() { stop(); S.view = S.run && !S.run.done ? "setup" : S.view; }
  function paint() { if (app) app.innerHTML = view(); }

  function view() {
    var list = pool();
    if (!DX.questions.length) return '<div class="wrap stack"><h1>Spotter</h1><p class="lede">Loading questions…</p></div>';
    if (!list.length) return '<div class="wrap stack"><h1>Spotter</h1><p class="lede">No picture questions are available yet.</p></div>';
    if (S.view === "run") return runView();
    if (S.view === "end") return endView();
    return setupView(list);
  }

  function setupView(list) {
    var tcount = {}, byArea = {};
    list.forEach(function (q) { var m = tcount[q.topic] = tcount[q.topic] || {}; m[stationKey(q)] = 1; });
    Object.keys(tcount).forEach(function (t) { var a = DX.topicById[t] ? DX.topicById[t].area : "other"; (byArea[a] = byArea[a] || []).push(t); });
    if (S.sel === null) { S.sel = {}; Object.keys(tcount).forEach(function (t) { S.sel[t] = true; }); }   /* first visit: everything ticked */
    var chosen = list.filter(function (q) { return S.sel[q.topic]; }), avail = byStation(chosen).keys.length, nTop = Object.keys(S.sel).filter(function (t) { return S.sel[t] && tcount[t]; }).length;
    var areas = Object.keys(byArea).sort().map(function (a) {
      var ts = byArea[a].sort(), allOn = ts.every(function (t) { return S.sel[t]; }), nm = DX.areaById && DX.areaById[a] ? DX.areaById[a].name : a;
      return '<div class="field"><div class="row tight" style="align-items:center;justify-content:space-between"><span class="label">' + esc(nm) + '</span><button class="chip toggle" data-act="ar" data-id="' + esc(a) + '" aria-pressed="' + allOn + '">Whole area</button></div>' +
        '<div class="chips">' + ts.map(function (t) { return '<button class="chip toggle" data-act="tp" data-id="' + esc(t) + '" aria-pressed="' + !!S.sel[t] + '">' + esc(topicName(t)) + ' · ' + Object.keys(tcount[t]).length + '</button>'; }).join("") + '</div></div>';
    }).join("");
    function seg(name, act, vals, cur, suffix) {
      return '<div class="chips" role="group" aria-label="' + name + '">' + vals.map(function (v) { return '<button class="chip toggle" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + v + suffix + '</button>'; }).join("") + '</div>';
    }
    var n = Math.min(S.n, avail);
    return '<div class="wrap stack"><header><p class="eyebrow">Spotter</p><h1>Steeplechase</h1>' +
      '<p class="lede">A run of stations. Each shows an image and its linked question or questions for a fixed time, then moves on by itself. You cannot go back, like the real exam.</p></header>' +
      '<section class="section stack"><div class="field"><div class="row tight" style="align-items:center;justify-content:space-between"><span class="label">Slides from</span><span class="row tight"><button class="btn ghost small" data-act="selall">Select all</button><button class="btn ghost small" data-act="selnone">Clear</button></span></div>' + areas +
      '<p class="hint">' + nTop + ' topic' + (nTop === 1 ? "" : "s") + ' selected · ' + avail + ' slide' + (avail === 1 ? "" : "s") + '. Numbers beside each topic are slides. More subjects appear here as they get pictures.</p></div>' +
      '<div class="field"><span class="label">Stations</span>' + seg("Stations", "n", [5, 10, 15, 20, 30], S.n, "") + '</div>' +
      '<div class="field"><span class="label">Seconds per station</span>' + seg("Seconds", "secs", [5, 10, 15, 20, 30, 45], S.secs, " s") + '</div>' +
      '<div class="field"><button class="chip toggle" data-act="bell" aria-pressed="' + S.bell + '">\uD83D\uDD14 Bell at each station change</button><p class="hint">The bell only sounds if Sound is on in the top bar.</p></div>' +
      (avail && avail < S.n ? '<p class="hint">Only ' + avail + ' slide' + (avail === 1 ? "" : "s") + ' selected, so the run will have ' + avail + ' station' + (avail === 1 ? "" : "s") + '.</p>' : "") +
      (S.note ? '<p class="note bad" role="status">' + esc(S.note) + '</p>' : "") +
      '<div class="row"><button class="btn primary" data-act="start"' + (avail ? "" : " disabled") + '>' + (avail ? 'Start ' + n + ' station' + (n === 1 ? "" : "s") + ' · about ' + Math.ceil(n * S.secs / 60) + ' min' : "Tick at least one topic") + '</button></div></section></div>';
  }

  function start() {
    var list = pool().filter(function (q) { return S.sel && S.sel[q.topic]; });
    var grouped = byStation(list), keys = DX.shuffle(grouped.keys).slice(0, S.n);
    if (!keys.length) { S.note = "Tick at least one topic."; paint(); return; }
    var items = keys.map(function (k) {
      var qs = grouped.map[k];
      return { questions: qs, qi: 0, orders: qs.map(function (q) { return DX.optOrder(q.options); }), picks: qs.map(function () { return null; }) };
    });
    if (DX.fx && DX.fx.unlock) DX.fx.unlock();   /* the tap on Start lets the bell play later */
    S.run = { items: items, i: 0, left: S.secs, done: false, startedAt: Date.now() };
    S.view = "run"; S.note = ""; paint(); tickStart();
  }

  function tickStart() {
    stop(); var r = S.run; r.deadline = Date.now() + r.left * 1000;
    S.timer = setInterval(function () {
      var left = Math.max(0, Math.ceil((r.deadline - Date.now()) / 1000));
      if (left !== r.left) { r.left = left; timerPaint(); }
      if (left <= 0) next();
    }, 250);
  }
  function timerPaint() {
    var r = S.run, t = document.getElementById("sp-t"), b = document.getElementById("sp-bar"); if (!t) return;
    t.textContent = r.left; t.className = "sp-t" + (r.left <= 5 ? " low" : "");
    if (b) b.style.width = Math.round(100 * r.left / S.secs) + "%";
  }
  function next() {
    var r = S.run; if (!r) return;
    if (r.i + 1 >= r.items.length) { finish(); return; }
    if (S.bell && DX.fx) DX.fx.play("bell");
    r.i++; r.left = S.secs; r.deadline = Date.now() + S.secs * 1000; paint();
    var h = document.getElementById("sp-h"); if (h) h.focus();
  }
  function finish() {
    stop(); if (S.bell && DX.fx) DX.fx.play("bell"); var r = S.run; r.done = true; r.secsUsed = Math.round((Date.now() - r.startedAt) / 1000); S.view = "end";
    var res = []; r.items.forEach(function (st) { st.questions.forEach(function (q, qi) { var pick = st.picks[qi]; res.push({ id:q.id, ok:pick === q.answer, picked:pick !== null }); }); });
    DX.record(res.map(function (x) { return { id: x.id, ok: x.ok }; }));
    if (DX.cloud && DX.cloud.submit) DX.cloud.submit(res.filter(function (x) { return x.picked; }).map(function (x) { return { id: x.id, ok: x.ok }; }));
    paint(); window.scrollTo(0, 0);
  }

  function runView() {
    var r = S.run, it = r.items[r.i], q = it.questions[it.qi];
    var opts = it.orders[it.qi].map(function (oi, k) {
      return '<button class="opt' + (it.picks[it.qi] === oi ? " sel" : "") + '" data-act="pick" data-oi="' + oi + '" aria-pressed="' + (it.picks[it.qi] === oi) + '"><span class="k">' + LETTERS[k] + '</span><span>' + esc(q.options[oi]) + '</span></button>';
    }).join("");
    return '<div class="wrap stack sp">' +
      '<div class="top"><span id="sp-h" tabindex="-1">Station ' + (r.i + 1) + ' of ' + r.items.length + '</span><span class="sp-t' + (r.left <= 5 ? " low" : "") + '" id="sp-t" aria-label="Seconds left">' + r.left + '</span><button data-act="quit">Quit</button></div>' +
      '<div class="track"><i id="sp-bar" style="width:' + Math.round(100 * r.left / S.secs) + '%;transition:width .25s linear"></i></div>' +
      DX.qImg(q) + '<h2 class="qtext">' + esc(q.q) + '</h2><div class="opts">' + opts + '</div>' +
      '<p class="hint">You can change your answer until time is up. It moves on by itself, and there is no going back.' + (window.matchMedia && matchMedia("(pointer:fine)").matches ? " Keys: A to D." : "") + '</p>' +
      '<div class="row tight">' + (it.qi + 1 < it.questions.length ? '<button class="btn primary small" data-act="nextq">Next question</button>' : '') + '<button class="btn ghost small" data-act="skip">Next station now</button></div></div>';
  }

  function endView() {
    var r = S.run, all = [];
    r.items.forEach(function (st, si) { st.questions.forEach(function (q, qi) { all.push({ q:q, pick:st.picks[qi], station:si }); }); });
    var ok = all.filter(function (x) { return x.pick === x.q.answer; }).length;
    var answered = all.filter(function (x) { return x.pick !== null; }).length;
    var rows = all.map(function (x) {
      var q=x.q, good=x.pick===q.answer;
      return '<article><span class="st ' + (good ? "c" : "m") + '">' + (x.pick===null ? "No answer" : good ? "Correct" : "Missed") + ' · Station ' + (x.station+1) + ' · ' + esc(topicName(q.topic)) + '</span>' + DX.qImg(q,"small") +
        '<p class="q">' + esc(q.q) + '</p><p class="ans">' + (x.pick!==null && !good ? 'You chose: ' + esc(q.options[x.pick]) + '<br>' : "") + 'Answer: ' + esc(q.options[q.answer]) + '</p>' + (q.explain ? '<p class="exp">' + esc(q.explain) + '</p>' : "") + '</article>';
    }).join("");
    return '<div class="wrap stack"><header><p class="eyebrow">Spotter</p><h1>' + ok + ' out of ' + all.length + '</h1><p class="lede">' + answered + ' answered' + (answered < all.length ? ", " + (all.length-answered) + " unanswered" : "") + ' · about ' + Math.max(1,Math.round(r.secsUsed/60)) + ' min. Wrong or blank questions are the ones to revisit.</p></header>' +
      '<div class="row"><button class="btn primary" data-act="again">Another run</button><button class="btn ghost" data-act="setup">Change settings</button></div><section class="review stack">' + rows + '</section></div>';
  }

  function pick(oi) { var r = S.run; if (!r || r.done) return; r.items[r.i].picks[r.items[r.i].qi] = oi; var o = document.querySelectorAll(".sp .opt"); Array.prototype.forEach.call(o, function (b) { var on = Number(b.getAttribute("data-oi")) === oi; b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on); }); }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
    var a = b.getAttribute("data-act"), v = b.getAttribute("data-v");
    if (a === "n") { S.n = Number(v); paint(); }
    else if (a === "tp") { var id = b.getAttribute("data-id"); S.sel[id] = !S.sel[id]; paint(); }
    else if (a === "ar") { var ar = b.getAttribute("data-id"), ts = Object.keys(S.sel).filter(function (t) { return (DX.topicById[t] || {}).area === ar; }), on = ts.every(function (t) { return S.sel[t]; }); ts.forEach(function (t) { S.sel[t] = !on; }); paint(); }
    else if (a === "selall") { Object.keys(S.sel).forEach(function (t) { S.sel[t] = true; }); paint(); }
    else if (a === "selnone") { Object.keys(S.sel).forEach(function (t) { S.sel[t] = false; }); paint(); }
    else if (a === "bell") { S.bell = !S.bell; paint(); }
    else if (a === "secs") { S.secs = Number(v); paint(); }
    else if (a === "start" || a === "again") start();
    else if (a === "setup") { S.view = "setup"; paint(); }
    else if (a === "pick") pick(Number(b.getAttribute("data-oi")));
    else if (a === "nextq") { var it = S.run.items[S.run.i]; if (it.qi + 1 < it.questions.length) { it.qi++; paint(); } }
    else if (a === "skip") next();
    else if (a === "quit") { stop(); S.run = null; S.view = "setup"; paint(); }
  }
  function onInput() { }
  function onKey(e) {
    if (S.view !== "run" || !S.run || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = LETTERS.indexOf(String(e.key).toUpperCase()); if (k < 0) return;
    var it = S.run.items[S.run.i]; if (it.orders[it.qi][k] != null) { e.preventDefault(); pick(it.orders[it.qi][k]); }
  }
  DX.spotter = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave };
})();
