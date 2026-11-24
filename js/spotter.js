/* Spotter (steeplechase): a run of stations, each a picture and a question for a fixed time, then it moves on by itself. No going back. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var LETTERS = ["A", "B", "C", "D"];
  var S = { view: "setup", topic: "all", n: 10, secs: 45, run: null, timer: null, note: "" };

  function pool() { return DX.questions.filter(function (q) { return q.image && q.options && q.options.length === 4 && typeof q.answer === "number"; }); }
  function topicName(id) { var t = DX.topicById && DX.topicById[id]; return t ? t.name : id; }
  function byImage(list) { var m = {}; list.forEach(function (q) { (m[q.image] = m[q.image] || []).push(q); }); return m; }
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
    var topics = {}; list.forEach(function (q) { var m = topics[q.topic] = topics[q.topic] || {}; m[q.image] = 1; });
    var scoped = S.topic === "all" ? list : list.filter(function (q) { return q.topic === S.topic; });
    var avail = Object.keys(byImage(scoped)).length;
    var opts = '<option value="all"' + (S.topic === "all" ? " selected" : "") + '>All slides (' + Object.keys(byImage(list)).length + ')</option>' +
      Object.keys(topics).sort().map(function (t) { return '<option value="' + esc(t) + '"' + (S.topic === t ? " selected" : "") + '>' + esc(topicName(t)) + ' (' + Object.keys(topics[t]).length + ')</option>'; }).join("");
    function seg(name, vals, cur, suffix) {
      return '<div class="chips" role="group" aria-label="' + name + '">' + vals.map(function (v) { return '<button class="chip toggle" data-act="' + (name === "Stations" ? "n" : "secs") + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + v + suffix + '</button>'; }).join("") + '</div>';
    }
    var n = Math.min(S.n, avail);
    return '<div class="wrap stack"><header><p class="eyebrow">Spotter</p><h1>Steeplechase</h1>' +
      '<p class="lede">A run of stations. Each shows a slide and a question for a fixed time, then moves on by itself. You cannot go back, like the real exam.</p></header>' +
      '<section class="section stack"><div class="field"><label class="label" for="sp-topic">Slides from</label><select id="sp-topic">' + opts + '</select></div>' +
      '<div class="field"><span class="label">Stations</span>' + seg("Stations", [5, 10, 15, 20], S.n, "") + '</div>' +
      '<div class="field"><span class="label">Seconds per station</span>' + seg("Seconds", [30, 45, 60, 90], S.secs, " s") + '</div>' +
      (avail < S.n ? '<p class="hint">Only ' + avail + ' slide' + (avail === 1 ? "" : "s") + ' here, so the run will have ' + avail + ' station' + (avail === 1 ? "" : "s") + '.</p>' : "") +
      (S.note ? '<p class="note bad" role="status">' + esc(S.note) + '</p>' : "") +
      '<div class="row"><button class="btn primary" data-act="start"' + (avail ? "" : " disabled") + '>Start ' + n + ' station' + (n === 1 ? "" : "s") + ' · about ' + Math.ceil(n * S.secs / 60) + ' min</button></div></section></div>';
  }

  function start() {
    var list = pool().filter(function (q) { return S.topic === "all" || q.topic === S.topic; });
    var imgs = byImage(list), keys = DX.shuffle(Object.keys(imgs)).slice(0, S.n);
    if (!keys.length) { S.note = "No slides for that choice."; paint(); return; }
    var items = keys.map(function (k) {
      var qs = imgs[k], q = qs[Math.floor(Math.random() * qs.length)];
      return { q: q, order: DX.optOrder(q.options), pick: null };
    });
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
    r.i++; r.left = S.secs; r.deadline = Date.now() + S.secs * 1000; paint();
    var h = document.getElementById("sp-h"); if (h) h.focus();
  }
  function finish() {
    stop(); var r = S.run; r.done = true; r.secsUsed = Math.round((Date.now() - r.startedAt) / 1000); S.view = "end";
    var res = r.items.map(function (x) { return { id: x.q.id, ok: x.pick === x.q.answer, picked: x.pick !== null }; });
    DX.record(res.map(function (x) { return { id: x.id, ok: x.ok }; }));
    if (DX.cloud && DX.cloud.submit) DX.cloud.submit(res.filter(function (x) { return x.picked; }).map(function (x) { return { id: x.id, ok: x.ok }; }));
    paint(); window.scrollTo(0, 0);
  }

  function runView() {
    var r = S.run, it = r.items[r.i], q = it.q;
    var opts = it.order.map(function (oi, k) {
      return '<button class="opt' + (it.pick === oi ? " sel" : "") + '" data-act="pick" data-oi="' + oi + '" aria-pressed="' + (it.pick === oi) + '"><span class="k">' + LETTERS[k] + '</span><span>' + esc(q.options[oi]) + '</span></button>';
    }).join("");
    return '<div class="wrap stack sp">' +
      '<div class="top"><span id="sp-h" tabindex="-1">Station ' + (r.i + 1) + ' of ' + r.items.length + '</span><span class="sp-t' + (r.left <= 5 ? " low" : "") + '" id="sp-t" aria-label="Seconds left">' + r.left + '</span><button data-act="quit">Quit</button></div>' +
      '<div class="track"><i id="sp-bar" style="width:' + Math.round(100 * r.left / S.secs) + '%;transition:width .25s linear"></i></div>' +
      DX.qImg(q) + '<h2 class="qtext">' + esc(q.q) + '</h2><div class="opts">' + opts + '</div>' +
      '<p class="hint">You can change your answer until time is up. It moves on by itself, and there is no going back.' + (window.matchMedia && matchMedia("(pointer:fine)").matches ? " Keys: A to D." : "") + '</p>' +
      '<div class="row tight"><button class="btn ghost small" data-act="skip">Next station now</button></div></div>';
  }

  function endView() {
    var r = S.run, ok = r.items.filter(function (x) { return x.pick === x.q.answer; }).length, answered = r.items.filter(function (x) { return x.pick !== null; }).length;
    var rows = r.items.map(function (x, i) {
      var good = x.pick === x.q.answer;
      return '<article><span class="st ' + (good ? "c" : "m") + '">' + (x.pick === null ? "No answer" : good ? "Correct" : "Missed") + ' · Station ' + (i + 1) + ' · ' + esc(topicName(x.q.topic)) + '</span>' + DX.qImg(x.q, "small") +
        '<p class="q">' + esc(x.q.q) + '</p><p class="ans">' + (x.pick !== null && !good ? 'You chose: ' + esc(x.q.options[x.pick]) + '<br>' : "") + 'Answer: ' + esc(x.q.options[x.q.answer]) + '</p>' + (x.q.explain ? '<p class="exp">' + esc(x.q.explain) + '</p>' : "") + '</article>';
    }).join("");
    return '<div class="wrap stack"><header><p class="eyebrow">Spotter</p><h1>' + ok + ' out of ' + r.items.length + '</h1><p class="lede">' + answered + ' answered' + (answered < r.items.length ? ", " + (r.items.length - answered) + " ran out of time" : "") + ' · about ' + Math.max(1, Math.round(r.secsUsed / 60)) + ' min. Wrong or blank stations are the ones to revisit.</p></header>' +
      '<div class="row"><button class="btn primary" data-act="again">Another run</button><button class="btn ghost" data-act="setup">Change settings</button></div>' +
      '<section class="review stack">' + rows + '</section></div>';
  }

  function pick(oi) { var r = S.run; if (!r || r.done) return; r.items[r.i].pick = oi; var o = document.querySelectorAll(".sp .opt"); Array.prototype.forEach.call(o, function (b) { var on = Number(b.getAttribute("data-oi")) === oi; b.classList.toggle("sel", on); b.setAttribute("aria-pressed", on); }); }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
    var a = b.getAttribute("data-act"), v = b.getAttribute("data-v");
    if (a === "n") { S.n = Number(v); paint(); }
    else if (a === "secs") { S.secs = Number(v); paint(); }
    else if (a === "start" || a === "again") start();
    else if (a === "setup") { S.view = "setup"; paint(); }
    else if (a === "pick") pick(Number(b.getAttribute("data-oi")));
    else if (a === "skip") next();
    else if (a === "quit") { stop(); S.run = null; S.view = "setup"; paint(); }
  }
  function onInput(e) { if (e.target && e.target.id === "sp-topic") { S.topic = e.target.value; paint(); } }
  function onKey(e) {
    if (S.view !== "run" || !S.run || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = LETTERS.indexOf(String(e.key).toUpperCase()); if (k < 0) return;
    var it = S.run.items[S.run.i]; if (it.order[k] != null) { e.preventDefault(); pick(it.order[k]); }
  }
  DX.spotter = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave };
})();
