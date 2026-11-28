/* True/False stems, exam style: a stem with 4 or 5 statements. Mark each True or False (or leave it blank to skip).
   Exam marking: +1 right, -1 wrong, 0 skipped. Practice marking: no penalty.
   Scores and detailed history stay on this device; signed-in stem results sync separately for activity and leaderboards. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var RUNKEY = "dx.tf.run", SKEY = "dx.tfstats";
  var T = { view: "pick", sel: null, n: 10, mode: "exam", only: false, run: null, note: "", timed: false, minutes: 15, timer: null, nugTimer: null };

  function stats() { return DX.store.get(SKEY, {}); }
  function topicName(id) { var shortNames = {"phys-renal-structure":"Kidney structure & renal circulation","phys-urine-concentration":"Urine concentration","phys-renal-tests-failure":"Renal function & failure","pg-cell-physiology-and-membrane-transport":"Cell physiology & transport","ga-anatomical-position-and-terminology":"Anatomical terminology"}; if (shortNames[id]) return shortNames[id]; var t = DX.topicById && DX.topicById[id]; return t ? t.name : id; }
  function stemById(id) { for (var i = 0; i < DX.tfStems.length; i++) if (DX.tfStems[i].id === id) return DX.tfStems[i]; return null; }
  function sid(stem, i) { return stem.id + "~" + i; }

  function missedStem(stem, st) { return stem.items.some(function (x, i) { var s = st[sid(stem, i)]; return s && s.last === 0; }); }
  function seenStem(stem, st) { return stem.items.some(function (x, i) { return !!st[sid(stem, i)]; }); }

  function saveRun() { try { if (T.run && !T.run.done) DX.store.set(RUNKEY, T.run); else DX.store.set(RUNKEY, null); } catch (e) { } }
  function savedRun() { var r = DX.store.get(RUNKEY, null); return r && r.items && r.items.length && r.i < r.items.length && !r.done ? r : null; }

  function render(a) {
    app = a;
    if (DX.tfPreselect && DX.tfPreselect.length && !(T.view === "run" && T.run && !T.run.done)) {
      /* Arrived from a practice result: show only the stems from the topics just practised. */
      T.pre = DX.tfPreselect.slice(); DX.tfPreselect = null;
      T.sel = {}; DX.tfStems.forEach(function (s) { T.sel[s.topic] = T.pre.indexOf(s.topic) > -1; });
      T.only = false; T.view = "pick"; T.note = "Showing stems from the topics you just practised.";
    }
    if (T.view === "run" && !(T.run && !T.run.done)) T.view = "pick";
    if (T.view === "run") startTimer();
    paint();
  }
  function leave() { stopTimer(); }
  function paint() {
    if (app) app.innerHTML = view();
    syncLoadingNugget();
  }
  function syncLoadingNugget() {
    var loading = !DX.tfStems.length && DX.loadingQuestions && typeof DX.nugget === "function";
    if (loading) {
      if (!T.nugTimer) T.nugTimer = setInterval(function () {
        var el = app && app.querySelector("#tf-nugtext");
        if (el) el.textContent = DX.nugget();
      }, 7000);
    } else if (T.nugTimer) {
      clearInterval(T.nugTimer); T.nugTimer = null;
    }
  }

  function view() {
    if (!DX.tfStems || !DX.tfStems.length) return '<div class="wrap stack"><h1>True or false</h1><p class="lede"><i class="spin"></i>' + (DX.loadingQuestions ? "Loading the first true/false stems…" : "No true/false stems are available yet.") + '</p>' +
      (typeof DX.nugget === "function" ? '<aside class="nugget tf-loading-nugget" aria-live="polite"><b>Did you know?</b> <span id="tf-nugtext">' + esc(DX.nugget()) + '</span></aside>' : '') +
      '<p class="hint tfstemmeta">You can use Practice while this question bank loads.</p></div>';
    if (T.view === "run") return runView();
    if (T.view === "end") return endView();
    return pickView();
  }

  /* ---------- picker ---------- */
  function pickView() {
    var stems = DX.tfStems, st = stats();
    if (!stems.length) return '<div class="wrap stack"><header><p class="eyebrow">True or false</p><h1>Exam-style stems</h1></header><p class="lede">' + (DX.loadingQuestions ? "Loading the first stems…" : "There are no true/false stems in the bank yet.") + '</p></div>';
    var byTopic = {}, bySubject = {};
    stems.forEach(function (s) { byTopic[s.topic] = (byTopic[s.topic] || 0) + 1; });
    if (T.sel === null) { T.sel = {}; Object.keys(byTopic).forEach(function (t) { T.sel[t] = true; }); }
    var missedN = stems.filter(function (s) { return T.sel[s.topic] && missedStem(s, st); }).length;
    var chosen = stems.filter(function (s) { return T.sel[s.topic] && (!T.only || missedStem(s, st)); });
    var avail = chosen.length, n = Math.min(T.n, avail), nTop = Object.keys(byTopic).filter(function (t) { return T.sel[t]; }).length;
    var saved = savedRun();

    var subj = DX.curriculum.subjects.map(function (s) {
      var subjectTopics = [];
      s.areas.forEach(function (a) { a.topics.forEach(function (t) { if (byTopic[t.id]) subjectTopics.push(t); }); });
      if (!subjectTopics.length) return "";
      var subjectOn = subjectTopics.filter(function (t) { return !!T.sel[t.id]; }).length;
      var subjectAll = subjectOn === subjectTopics.length, subjectSome = subjectOn > 0 && !subjectAll;
      var areas = s.areas.map(function (a) {
        var ts = a.topics.filter(function (t) { return byTopic[t.id]; });
        if (!ts.length) return "";
        var onCount = ts.filter(function (t) { return !!T.sel[t.id]; }).length;
        var allOn = onCount === ts.length, someOn = onCount > 0 && !allOn;
        var state = allOn ? "✓ " : (someOn ? "◐ " : "○ ");
        return '<div class="field tf-area"><div class="row tight" style="align-items:center;justify-content:space-between"><span class="label">' + esc(a.name) + ' <small class="tf-count">' + onCount + '/' + ts.length + '</small></span><button class="chip toggle tf-scope-toggle" data-act="ar" data-id="' + esc(a.id) + '" aria-pressed="' + (allOn ? "true" : (someOn ? "mixed" : "false")) + '">' + state + (allOn ? "Deselect area" : "Select area") + '</button></div>' +
          '<div class="chips">' + ts.map(function (t) { var on = !!T.sel[t.id]; return '<button class="chip toggle tf-topic-toggle' + (on ? ' is-on' : '') + '" data-act="tp" data-id="' + esc(t.id) + '" aria-pressed="' + on + '">' + (on ? "✓ " : "○ ") + esc(t.name) + ' · ' + byTopic[t.id] + '</button>'; }).join("") + '</div></div>';
      }).join("");
      var cnt = 0; subjectTopics.forEach(function (t) { cnt += byTopic[t.id] || 0; });
      var status = subjectAll ? "All included" : (subjectSome ? "Partially included" : "None included");
      return '<div class="tf-subject-row"><details class="acc subj"' + (T.openSubj && T.openSubj[s.id] ? " open" : "") + '><summary><span>' + esc(s.name) + '</span><small>' + (subjectAll ? "✓ " : (subjectSome ? "◐ " : "○ ")) + status + ' · ' + subjectOn + '/' + subjectTopics.length + ' topics · ' + cnt + ' stems</small></summary><div class="secbody">' + areas + '</div></details><button type="button" class="chip toggle tf-subject-toggle' + (subjectAll ? ' is-on' : '') + '" data-act="sub" data-id="' + esc(s.id) + '" aria-pressed="' + (subjectAll ? "true" : (subjectSome ? "mixed" : "false")) + '">' + (subjectAll ? "✓ Deselect" : (subjectSome ? "◐ Select all" : "○ Select all")) + '</button></div>';
    }).join("");

    function seg(label, act, vals, cur, fmt) {
      return '<div class="chips" role="group" aria-label="' + label + '">' + vals.map(function (v) { return '<button class="chip toggle" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + (fmt ? fmt(v) : v) + '</button>'; }).join("") + '</div>';
    }
    return '<div class="wrap stack"><header><p class="eyebrow">True or false</p><h1>Exam-style stems</h1>' +
      '<p class="lede">Each stem has four or five statements. Mark every statement True or False, or leave it blank to skip it, like the real paper.</p><div class="row"><button class="btn primary" data-act="quick">Quick start · 5 stems</button><span class="hint">No setup needed · practice marking</span></div></header>' +
      (saved ? '<section class="section stack tfresume"><p><b>You have an unfinished run</b> (stem ' + (saved.i + 1) + ' of ' + saved.items.length + ').</p><div class="row"><button class="btn primary" data-act="resume">Continue</button><button class="btn ghost" data-act="discard">Discard it</button></div></section>' : "") +
      '<section class="section stack"><div class="field"><span class="label">Marking</span>' + seg("Marking", "mode", ["exam", "practice"], T.mode, function (v) { return v === "exam" ? "Exam: +1 right, −1 wrong, 0 skipped" : "Practice: no penalty"; }) + '</div>' +
      '<div class="field"><span class="label">Stems in this run</span>' + seg("Stems", "n", [5, 10, 15, 20], T.n) + '</div>' +
      (missedN ? '<div class="field"><button class="chip toggle" data-act="only" aria-pressed="' + T.only + '">Only stems with statements I got wrong · ' + missedN + '</button></div>' : "") +
      '<div class="field"><div class="row tight" style="align-items:center;justify-content:space-between"><span class="label">Choose your topics</span><span class="row tight"><button class="chip toggle" data-act="selall" aria-pressed="false">✓ All</button><button class="chip toggle" data-act="selnone" aria-pressed="false">○ None</button></span></div><p class="hint tf-picker-help">Everything is included to start. Open a subject to choose a whole subject, an area, or individual topics.</p>' + subj + '</div>' +
      '<p class="hint">' + nTop + ' topic' + (nTop === 1 ? "" : "s") + ' ticked · ' + avail + ' stem' + (avail === 1 ? "" : "s") + ' available. Numbers beside topics are stems.' + (DX.loadingQuestions ? " More stems may appear as the bank loads." : "") + '</p>' +
      '<section class="section stack"><div class="field"><span class="label">Timed exam</span><div class="chips"><button class="chip toggle" data-act="timed" data-v="off" aria-pressed="' + !T.timed + '">Untimed</button><button class="chip toggle" data-act="timed" data-v="on" aria-pressed="' + T.timed + '">Timed</button></div></div>' +
      (T.timed ? '<div class="field"><span class="label">Time limit</span>' + seg("Time limit", "minutes", [10, 15, 20, 30, 45], T.minutes, function (v) { return v + " min"; }) + '</div>' : "") +
      '<div class="field"><span class="label">Your topic performance</span><p class="hint">Based on marked statements on this device.</p>' + analyticsHtml(stems, st) + '</div></section>' +
      (T.note ? '<p class="note bad" role="status">' + esc(T.note) + '</p>' : "") + '</section>' +
      '<section class="row stickystart"><button class="btn primary" data-act="start"' + (avail ? "" : " disabled") + '>' + (avail ? 'Start ' + n + ' stem' + (n === 1 ? "" : "s") : "Tick a topic to start") + '</button><a class="btn ghost" href="#play" style="text-decoration:none">Back</a></section></div>';
  }

  function start() {
    var st = stats();
    var pool = DX.tfStems.filter(function (s) { return T.sel && T.sel[s.topic] && (!T.only || missedStem(s, st)); });
    if (!pool.length) { T.note = "Tick at least one topic that has stems."; paint(); return; }
    T.note = "";
    var fresh = DX.shuffle(pool.filter(function (s) { return !seenStem(s, st); })), seen = DX.shuffle(pool.filter(function (s) { return seenStem(s, st); }));
    var picked = fresh.concat(seen).slice(0, T.n);
    T.run = {
      mode: T.mode, i: 0, done: false, startedAt: Date.now(), timed: !!T.timed, durationMs: T.timed ? T.minutes * 60000 : 0, deadline: T.timed ? Date.now() + T.minutes * 60000 : 0,
      items: picked.map(function (s) {
        var order = DX.shuffle(s.items.map(function (x, i) { return i; }));
        return { id: s.id, attemptId: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12), order: order, ans: {}, checked: false };
      })
    };
    T.view = "run"; saveRun(); startTimer(); paint(); window.scrollTo(0, 0);
  }

  /* ---------- a stem ---------- */
  function runView() {
    var r = T.run, it = r.items[r.i], stem = stemById(it.id);
    if (!stem) { r.i++; if (r.i >= r.items.length) { finish(); return endView(); } return runView(); }
    var rows = it.order.map(function (oi, n) {
      var x = stem.items[oi], pick = it.ans[oi] || "", res = "";
      var tOn = pick === "t", fOn = pick === "f";
      if (it.checked) { res = pick === "" ? "s" : ((pick === "t") === x.answer ? "r" : "w"); }
      var m = it.checked ? (res === "r" ? 1 : res === "w" ? (r.mode === "exam" ? -1 : 0) : 0) : 0;
      return '<li class="tfrow' + (it.checked ? " done " + res : "") + '"><p class="tftext"><span class="tfn">' + (n + 1) + '.</span> ' + esc(x.text) + '</p>' +
        '<div class="tfbtns" role="radiogroup" aria-label="Statement ' + (n + 1) + '">' +
        '<button type="button" class="tfb' + (tOn ? " on" : "") + '" data-act="ans" data-i="' + oi + '" data-v="t" aria-pressed="' + tOn + '"' + (it.checked ? " disabled" : "") + '>True</button>' +
        '<button type="button" class="tfb' + (fOn ? " on" : "") + '" data-act="ans" data-i="' + oi + '" data-v="f" aria-pressed="' + fOn + '"' + (it.checked ? " disabled" : "") + '>False</button></div>' +
        (it.checked ? '<p class="tfres ' + res + '">' + (res === "r" ? "Correct" : res === "w" ? "Wrong" : "Skipped") + ' · ' + (m > 0 ? "+" : m < 0 ? "−" : "") + Math.abs(m) + ' mark' + (Math.abs(m) === 1 ? "" : "s") + ' · The answer is <b>' + (x.answer ? "True" : "False") + '</b>.' + (x.explain ? ' ' + esc(x.explain) : "") + '</p>' : "") + '</li>';
    }).join("");
    var last = r.i + 1 >= r.items.length, net = 0;
    if (it.checked) it.order.forEach(function (oi) { var p = it.ans[oi] || "", x = stem.items[oi]; if (p) net += ((p === "t") === x.answer) ? 1 : (r.mode === "exam" ? -1 : 0); });
    return '<div class="wrap stack"><div class="row tight" style="justify-content:space-between;align-items:center"><span class="eyebrow">Stem ' + (r.i + 1) + ' of ' + r.items.length + ' · ' + (r.mode === "exam" ? "Exam marking" : "Practice marking") + (r.timed ? ' · <b id="tfclock" aria-live="off">' + formatTime(Math.max(0, Math.ceil((r.deadline - Date.now()) / 1000))) + '</b>' : "") + '</span><button class="chip" data-act="quit" type="button">Stop</button></div>' +
      '<h2 class="qtext tfstemtitle">' + esc(stem.q) + '</h2><p class="hint">' + esc(topicName(stem.topic)) + '. Mark each statement True or False; leave it blank to skip.</p>' +
      '<ol class="tflist">' + rows + '</ol>' +
      (it.checked ? '<p class="tfnet"><b>' + (net > 0 ? "+" : net < 0 ? "−" : "") + Math.abs(net) + ' mark' + (Math.abs(net) === 1 ? "" : "s") + '</b> on this stem</p>' : "") +
      '<section class="row stickystart">' + (it.checked ? '<button class="btn primary" data-act="next">' + (last ? "See results" : "Next stem") + '</button>' : '<button class="btn primary" data-act="check">Check answers</button>') + '</section></div>';
  }

  function check() {
    var r = T.run, it = r.items[r.i], stem = stemById(it.id); if (!stem || it.checked) return;
    var st = stats(), net = 0, answered = 0, correct = 0;
    stem.items.forEach(function (x, i) {
      var p = it.ans[i] || ""; if (!p) return;
      var ok = (p === "t") === x.answer, s = st[sid(stem, i)] || { n: 0, c: 0, last: 0 };
      s.n++; if (ok) { s.c++; correct++; } s.last = ok ? 1 : 0; s.lastAt = Date.now(); st[sid(stem, i)] = s; answered++;
      net += ok ? 1 : (r.mode === "exam" ? -1 : 0);
    });
    DX.store.set(SKEY, st);
    it.checked = true; saveRun();
    if (DX.cloud && DX.cloud.submitTF && answered) DX.cloud.submitTF({
      attempt_id: it.attemptId, stem_id: stem.id, topic_id: stem.topic,
      answered_count: answered, correct_count: correct, total_count: stem.items.length
    });
    if (DX.fx && answered) { DX.fx.play(net > 0 ? "ok" : "bad"); }
    if (DX.streakTick && answered) DX.streakTick(answered);
    paint(); window.scrollTo(0, 0);
  }
  function next() {
    var r = T.run; if (!r) return;
    if (r.i + 1 >= r.items.length) { finish(); paint(); window.scrollTo(0, 0); return; }
    r.i++; saveRun(); paint(); window.scrollTo(0, 0);
  }
  function finish() { stopTimer(); T.run.done = true; T.run.finishedAt = Date.now(); T.view = "end"; saveRun(); }
  function formatTime(sec) { sec = Math.max(0, sec); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  function startTimer() {
    stopTimer(); if (!T.run || !T.run.timed || !T.run.deadline) return;
    T.timer = setInterval(function () {
      if (!T.run || T.run.done) { stopTimer(); return; }
      var left = Math.max(0, Math.ceil((T.run.deadline - Date.now()) / 1000));
      var node = document.getElementById("tfclock"); if (node) node.textContent = formatTime(left);
      if (left <= 0) { T.run.expired = true; var current = T.run.items[T.run.i]; if (current && !current.checked) check(); T.run.items.forEach(function (it) { if (!it.checked) it.checked = true; }); finish(); paint(); }
    }, 500);
  }
  function stopTimer() { if (T.timer) { clearInterval(T.timer); T.timer = null; } }
  function analyticsHtml(stems, st) {
    var by = {};
    stems.forEach(function (stem) { stem.items.forEach(function (x, i) { var v = st[sid(stem, i)]; if (!v || !v.n) return; var a = by[stem.topic] || (by[stem.topic] = { n: 0, c: 0 }); a.n += v.n; a.c += v.c; }); });
    var rows = Object.keys(by).map(function (id) { var a = by[id]; return { id: id, n: a.n, pct: Math.round(100 * a.c / a.n) }; }).sort(function (a, b) { return a.pct - b.pct; });
    if (!rows.length) return '<p class="hint">No marked statements yet. Your topic breakdown will build as you practise.</p>';
    return '<div class="stack">' + rows.map(function (x) { return '<div class="field"><div class="row tight" style="justify-content:space-between"><b>' + esc(topicName(x.id)) + '</b><span>' + x.pct + '% · ' + x.n + ' statements answered</span></div><div class="meter"><i style="width:' + x.pct + '%"></i></div></div>'; }).join("") + '</div><button type="button" class="chip" data-act="weak">Revise topics below 70%</button>';
  }
  function reviseWeak() {
    var st = stats(), totals = {};
    DX.tfStems.forEach(function (stem) { stem.items.forEach(function (x, i) { var v = st[sid(stem, i)]; if (!v || !v.n) return; var a = totals[stem.topic] || (totals[stem.topic] = { n: 0, c: 0 }); a.n += v.n; a.c += v.c; }); });
    var weak = {}; Object.keys(totals).forEach(function (id) { if (totals[id].n >= 3 && totals[id].c / totals[id].n < 0.7) weak[id] = true; });
    if (!Object.keys(weak).length) { T.note = "No topic has enough attempts below 70% yet. Keep practising to build a reliable picture."; paint(); return; }
    T.sel = {}; DX.tfStems.forEach(function (s) { T.sel[s.topic] = !!weak[s.topic]; }); T.only = false; T.note = "Showing all stems from topics below 70% accuracy (at least 3 attempts)."; paint(); window.scrollTo(0, 0);
  }

  /* ---------- results ---------- */
  function endView() {
    var r = T.run, right = 0, wrong = 0, skip = 0, marks = 0, total = 0, miss = [];
    r.items.forEach(function (it) {
      var stem = stemById(it.id); if (!stem || !it.checked) return;
      stem.items.forEach(function (x, i) {
        total++; var p = it.ans[i] || "";
        if (!p) { skip++; return; }
        if ((p === "t") === x.answer) { right++; marks++; }
        else { wrong++; if (r.mode === "exam") marks--; miss.push({ stem: stem, x: x, p: p }); }
      });
    });
    var answered = right + wrong;
    var rows = miss.slice(0, 40).map(function (m) {
      return '<article class="tfmiss"><span class="st m">Wrong · ' + esc(m.stem.q) + '</span><p class="q">' + esc(m.x.text) + '</p><p class="ans">You said <b>' + (m.p === "t" ? "True" : "False") + '</b>. The answer is <b>' + (m.x.answer ? "True" : "False") + '</b>.' + (m.x.explain ? ' ' + esc(m.x.explain) : "") + '</p></article>';
    }).join("");
    return '<div class="wrap stack"><header><p class="eyebrow">True or false · ' + (r.mode === "exam" ? "Exam marking" : "Practice marking") + '</p><h1>' + marks + ' mark' + (Math.abs(marks) === 1 ? "" : "s") + ' out of ' + total + '</h1>' +
      '<p class="lede">' + (r.timed ? (r.expired ? "Time expired · " : "Timed paper · ") : "") + right + ' right, ' + wrong + ' wrong, ' + skip + ' skipped' + (answered ? ' · ' + DX.pct(right, answered) + '% of the ones you answered were right' : "") + '.' + (r.mode === "exam" && wrong > right ? ' Wrong answers cost a mark each, so skip a statement when you really do not know.' : "") + '</p></header>' +
      '<div class="row"><button class="btn primary" data-act="again">Another run</button><button class="btn ghost" data-act="pickview">Change topics</button><a class="btn ghost" href="#play" style="text-decoration:none">Play</a></div>' +
      (rows ? '<section class="review stack"><h2>Statements you got wrong</h2>' + rows + (miss.length > 40 ? '<p class="hint">Showing the first 40.</p>' : "") + '</section>' : '<p class="lede">No wrong answers this time.</p>') + '</div>';
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
    var a = b.getAttribute("data-act"), v = b.getAttribute("data-v");
    if (a === "mode") { T.mode = v; paint(); }
    else if (a === "n") { T.n = Number(v); paint(); }
    else if (a === "timed") { T.timed = v === "on"; paint(); }
    else if (a === "minutes") { T.minutes = Number(v); paint(); }
    else if (a === "weak") { reviseWeak(); }
    else if (a === "only") { T.only = !T.only; paint(); }
    else if (a === "tp") { var id = b.getAttribute("data-id"); T.sel[id] = !T.sel[id]; keepOpen(b); }
    else if (a === "sub") {
      var subId = b.getAttribute("data-id"), subject = DX.curriculum.subjects.filter(function (s) { return s.id === subId; })[0];
      if (subject) {
        var topicIds = []; subject.areas.forEach(function (a) { a.topics.forEach(function (t) { if (Object.prototype.hasOwnProperty.call(T.sel, t.id)) topicIds.push(t.id); }); });
        var turnOn = !topicIds.length || !topicIds.every(function (id) { return T.sel[id]; });
        topicIds.forEach(function (id) { T.sel[id] = turnOn; });
      }
      keepOpen(b);
    }
    else if (a === "ar") {
      var ar = b.getAttribute("data-id"), ts = Object.keys(T.sel).filter(function (t) { return (DX.topicById[t] || {}).area === ar; }), on = ts.every(function (t) { return T.sel[t]; });
      ts.forEach(function (t) { T.sel[t] = !on; }); keepOpen(b);
    }
    else if (a === "selall") { Object.keys(T.sel).forEach(function (t) { T.sel[t] = true; }); keepOpen(b); }
    else if (a === "selnone") { Object.keys(T.sel).forEach(function (t) { T.sel[t] = false; }); keepOpen(b); }
    else if (a === "quick") {
      T.sel = {}; DX.tfStems.forEach(function (s) { T.sel[s.topic] = true; });
      T.n = 5; T.mode = "practice"; T.only = false; T.timed = false; T.note = "";
      T.view = "pick"; start();
    }
    else if (a === "start" || a === "again") { if (a === "again" && T.view === "end") T.view = "pick"; start(); }
    else if (a === "pickview") { T.view = "pick"; paint(); window.scrollTo(0, 0); }
    else if (a === "resume") { T.run = savedRun(); if (T.run) { T.view = "run"; startTimer(); paint(); window.scrollTo(0, 0); } }
    else if (a === "discard") { DX.store.set(RUNKEY, null); paint(); }
    else if (a === "ans") {
      var r = T.run, it = r && r.items[r.i]; if (!it || it.checked) return;
      var i = b.getAttribute("data-i"); it.ans[i] = (it.ans[i] === v) ? "" : v;   /* tap again to clear and skip */
      if (!it.ans[i]) delete it.ans[i];
      saveRun(); var y = window.scrollY; paint(); window.scrollTo(0, y);
    }
    else if (a === "check") check();
    else if (a === "next") next();
    else if (a === "quit") { stopTimer(); T.run = null; DX.store.set(RUNKEY, null); T.view = "pick"; paint(); }
  }
  /* Keep the subject sections open while topics are ticked. */
  function keepOpen(b) {
    T.openSubj = {};
    Array.prototype.forEach.call(document.querySelectorAll("details.subj"), function (d, i) { var n = d.querySelector("summary span"); if (d.open && n) T.openSubj[subjectIdByName(n.textContent)] = true; });
    var y = window.scrollY; paint(); window.scrollTo(0, y);
  }
  function subjectIdByName(name) { var f = DX.curriculum.subjects.filter(function (s) { return s.name === name; })[0]; return f ? f.id : name; }
  function onInput() { }
  function onKey(e) {
    if (T.view !== "run" || !T.run || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = String(e.key).toLowerCase(); if (k !== "enter") return;
    var it = T.run.items[T.run.i]; if (!it) return;
    if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
    e.preventDefault(); if (it.checked) next(); else check();
  }
  function refreshProgress() { if (T.sel !== null) DX.tfStems.forEach(function (s) { if (!Object.prototype.hasOwnProperty.call(T.sel, s.topic)) T.sel[s.topic] = T.pre ? T.pre.indexOf(s.topic) > -1 : true; }); if (app && T.view === "pick") paint(); }
  DX.truefalse = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave, refreshProgress: refreshProgress };
})();