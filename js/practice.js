/* Practice mode: pick a scope, choose study or exam, answer, review. */
(function () {
  var DX = window.DX, esc = DX.esc, app;
  var LETTERS = ["A", "B", "C", "D", "E", "F"];
  var LEVELS = { 1: "Core", 2: "Applied", 3: "Challenge" };
  var P = { view: "pick", scope: null, subs: [], mode: "study", count: "all", run: null, showAll: false, report: null };

  function scopeQs(sc) {
    var qs = DX.questions;
    if (sc.kind === "all") return qs;
    if (sc.kind === "subject") return qs.filter(function (q) { return q.subject === sc.id; });
    if (sc.kind === "area") return qs.filter(function (q) { return q.area === sc.id; });
    if (sc.kind === "topic") return qs.filter(function (q) { return q.topic === sc.id; });
    if (sc.kind === "missed") {
      var st = DX.stats();
      return qs.filter(function (q) { return st[q.id] && st[q.id].last === 0; });
    }
    return [];
  }
  function scopeName(sc) {
    if (sc.kind === "all") return "All questions";
    if (sc.kind === "missed") return "Questions I missed last time";
    if (sc.kind === "subject") return DX.subjectById[sc.id].name;
    if (sc.kind === "area") return DX.areaById[sc.id].name;
    if (sc.kind === "topic") return DX.topicById[sc.id].name;
    return "";
  }
  function subOf(q) { return q.sub || DX.topicById[q.topic].name; }
  function unique(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  /* ---------- picker ---------- */
  function pickView() {
    var total = DX.questions.length, missed = scopeQs({ kind: "missed" }).length;
    var h = '<div class="wrap stack"><header><p class="eyebrow">Practice</p><h1>Choose what to drill</h1>' +
      '<p class="lede">' + total + ' questions. Tap an area to see its topics, which follow the MDCN curriculum. Greyed-out topics have no questions yet.</p></header>' +
      '<section class="row"><button class="btn primary" data-act="scope" data-kind="all">All questions · ' + total + '</button>' +
      (missed ? '<button class="btn" data-act="scope" data-kind="missed">Review what I missed · ' + missed + '</button>' : '') + '</section>';
    DX.curriculum.subjects.forEach(function (s) {
      var sc = DX.subjectCount(s.id);
      h += '<section class="section"><div class="shead"><h2>' + esc(s.name) + '</h2>' +
        (sc ? '<button class="btn ghost small" data-act="scope" data-kind="subject" data-id="' + s.id + '">All ' + esc(s.name) + ' · ' + sc + '</button>' : '<span class="muted">No questions yet</span>') + '</div>';
      s.areas.forEach(function (a) {
        var ac = DX.areaCount(a.id);
        h += '<details class="acc"><summary><span>' + esc(a.name) + '</span><small>' + (ac ? ac + " questions" : "empty") + '</small></summary><div class="topics">';
        if (ac && a.topics.length > 1) h += '<button class="btn ghost small" data-act="scope" data-kind="area" data-id="' + a.id + '">Drill the whole area · ' + ac + '</button>';
        a.topics.forEach(function (t) {
          h += '<button class="topic' + (t.count ? "" : " empty") + '" data-act="scope" data-kind="topic" data-id="' + t.id + '"' + (t.count ? "" : " disabled") + '><span>' + esc(t.name) + '</span><small>' + (t.count ? t.count + " questions" : "none yet") + '</small></button>';
        });
        h += '</div></details>';
      });
      h += '</section>';
    });
    return h + '</div>';
  }

  /* ---------- setup ---------- */
  function filtered() {
    var pool = scopeQs(P.scope);
    return pool.filter(function (q) { return P.subs.indexOf(subOf(q)) > -1; });
  }
  function setupView() {
    var pool = scopeQs(P.scope);
    var subs = unique(pool.map(subOf));
    var sel = filtered().length;
    var counts = [["all", "All " + sel]];
    [15, 30, 50].forEach(function (n) { if (sel > n) counts.push([String(n), String(n)]); });
    var h = '<div class="wrap stack"><header><p class="eyebrow">Practice setup</p><h1>' + esc(scopeName(P.scope)) + '</h1>' +
      '<p class="lede">' + pool.length + ' questions available.</p></header>';
    if (subs.length > 1) {
      h += '<section class="section"><p class="label">Sections</p><div class="chips">' + subs.map(function (s) {
        return '<button class="chip toggle" data-act="sub" data-v="' + esc(s) + '" aria-pressed="' + (P.subs.indexOf(s) > -1) + '">' + esc(s) + '</button>';
      }).join("") + '</div></section>';
    }
    h += '<section class="section"><p class="label">Mode</p><div class="seg">' +
      '<button data-act="mode" data-v="study" aria-pressed="' + (P.mode === "study") + '"><b>Study</b><span>See the explanation after every answer</span></button>' +
      '<button data-act="mode" data-v="exam" aria-pressed="' + (P.mode === "exam") + '"><b>Exam</b><span>No feedback until you finish</span></button></div></section>' +
      '<section class="section"><p class="label">How many</p><div class="chips">' + counts.map(function (c) {
        return '<button class="chip toggle" data-act="count" data-v="' + c[0] + '" aria-pressed="' + (P.count === c[0]) + '">' + c[1] + '</button>';
      }).join("") + '</div></section>' +
      '<section class="row"><button class="btn primary" data-act="start"' + (sel ? "" : " disabled") + '>Start · ' + (P.count === "all" ? sel : Math.min(sel, parseInt(P.count, 10))) + ' questions</button>' +
      '<button class="btn ghost" data-act="topics">Back</button></section></div>';
    return h;
  }

  /* ---------- report a problem ---------- */
  function reportHtml(q) {
    var C = DX.cloud;
    if (!C || !C.ok) return "";
    var R = P.report && P.report.id === q.id ? P.report : null;
    if (!R) {
      if (!C.canReport()) return '<a class="linkbtn" href="#account">Sign in to report a problem</a>';
      return '<button class="linkbtn" data-act="rep-open" data-id="' + esc(q.id) + '">Report a problem with this question</button>';
    }
    if (R.status === "sent") return '<p class="hint" role="status" style="padding:10px 0">Thanks. Your report was sent for review.</p>';
    var busy = R.status === "sending";
    var opts = Object.keys(C.reasons).map(function (k) {
      return '<option value="' + k + '"' + ((R.reason || "wrong_answer") === k ? " selected" : "") + '>' + esc(C.reasons[k]) + '</option>';
    }).join("");
    return '<div class="reportbox"><div class="field"><label class="label" for="rp-reason">What is wrong?</label><select id="rp-reason">' + opts + '</select></div>' +
      '<div class="field"><label class="label" for="rp-note">Details (optional)</label><textarea id="rp-note" maxlength="500" placeholder="For example: the textbook says otherwise, with the page or chapter if you have it">' + esc(R.note || "") + '</textarea></div>' +
      (R.msg ? '<p class="note bad" role="alert">' + esc(R.msg) + '</p>' : "") +
      '<div class="row tight"><button class="btn primary small" data-act="rep-send"' + (busy ? " disabled" : "") + '>' + (busy ? "Sending…" : "Send report") + '</button>' +
      '<button class="btn ghost small" data-act="rep-cancel"' + (busy ? " disabled" : "") + '>Cancel</button></div></div>';
  }
  function keepScroll() { var y = window.scrollY; render(); window.scrollTo(0, y); }

  /* ---------- run ---------- */
  function startRun(list) {
    var items = DX.shuffle(list).map(function (q) {
      return { q: q, order: DX.shuffle(q.options.map(function (_, i) { return i; })), pick: null };
    });
    P.run = { items: items, i: 0, done: false };
    P.showAll = false; P.view = "run"; P.report = null;
  }
  function questionView() {
    var r = P.run, it = r.items[r.i], q = it.q, study = P.mode === "study";
    var locked = study && it.pick !== null, total = r.items.length;
    var answered = r.items.filter(function (x) { return x.pick !== null; });
    var right = answered.filter(function (x) { return x.pick === x.q.answer; }).length;
    var opts = it.order.map(function (oi, k) {
      var cls = "opt";
      if (it.pick === oi) cls += " sel";
      if (locked) {
        cls = "opt";
        if (oi === q.answer) cls += " correct"; else if (it.pick === oi) cls += " wrong"; else cls += " dim";
      }
      return '<button class="' + cls + '" data-act="pick" data-oi="' + oi + '"' + (locked ? ' aria-disabled="true"' : "") + '><span class="k">' + LETTERS[k] + '</span><span>' + esc(q.options[oi]) + '</span></button>';
    }).join("");
    var explain = "";
    if (locked) {
      var ok = it.pick === q.answer;
      explain = '<div class="explain ' + (ok ? "ok" : "no") + '"><p class="verdict">' + (ok ? "Correct" : "Not quite") + '</p><p>' + esc(q.explain) + '</p></div>';
    }
    var last = r.i === total - 1;
    var showNext = !(study && !locked);
    return '<div class="wrap ' + (locked ? "locked" : "") + '">' +
      '<div class="top"><span>Question ' + (r.i + 1) + ' of ' + total + (study ? " · " + right + "/" + answered.length + " correct" : "") + '</span><button data-act="quit">Quit</button></div>' +
      '<div class="track"><i style="width:' + DX.pct(r.i + (locked ? 1 : 0), total) + '%"></i></div>' +
      '<div class="chips" style="margin-top:18px"><span class="chip">' + esc(subOf(q)) + '</span><span class="chip">' + (LEVELS[q.level] || "Core") + '</span>' + (q.verified ? '<span class="chip">Verified</span>' : '<span class="chip warn">Unverified</span>') + '</div>' +
      '<h2 class="qtext">' + esc(q.q) + '</h2><div class="opts">' + opts + '</div>' + explain + '<div>' + reportHtml(q) + '</div>' +
      '<div class="actions">' + (showNext ? '<button class="btn primary" style="width:100%" data-act="next"' + (it.pick === null ? ' aria-disabled="true"' : "") + '>' + (last ? "See results" : "Next question") + '</button>' : "") + '</div></div>';
  }
  function finish() {
    P.run.done = true;
    var res = P.run.items.map(function (x) { return { id: x.q.id, ok: x.pick === x.q.answer }; });
    DX.record(res);
    if (DX.cloud) DX.cloud.submit(res.filter(function (x, i) { var p = P.run.items[i].pick; return p !== null && p !== undefined; }));
  }
  function resultsView() {
    var items = P.run.items, n = items.length;
    var right = items.filter(function (x) { return x.pick === x.q.answer; });
    var missed = items.filter(function (x) { return x.pick !== x.q.answer; });
    var p = DX.pct(right.length, n);
    var verdict = p >= 90 ? "Exam ready." : p >= 75 ? "Solid. Tighten the weak spots." : p >= 60 ? "Getting there. Review what you missed." : "Go back to your notes, then retry.";
    var by = {}, order = [];
    items.forEach(function (x) {
      var s = subOf(x.q);
      if (!by[s]) { by[s] = { c: 0, n: 0 }; order.push(s); }
      by[s].n++; if (x.pick === x.q.answer) by[s].c++;
    });
    var bars = order.map(function (s) {
      var b = by[s], v = DX.pct(b.c, b.n), cls = v < 60 ? "low" : v < 85 ? "mid" : "";
      return '<div class="bar ' + cls + '"><div class="meta"><span>' + esc(s) + '</span><span>' + b.c + '/' + b.n + '</span></div><div class="t"><i style="width:' + v + '%"></i></div></div>';
    }).join("");
    var show = P.showAll ? items : missed;
    var rev = show.length ? show.map(function (x) {
      var ok = x.pick === x.q.answer;
      return '<article><span class="st ' + (ok ? "c" : "m") + '">' + (ok ? "Correct" : "Missed") + ' · ' + esc(subOf(x.q)) + '</span><p class="q">' + esc(x.q.q) + '</p><p class="ans">' +
        (ok ? "" : '<span class="x">Your answer: ' + esc(x.q.options[x.pick]) + '</span><br>') + '<span class="v">' + (ok ? "Answer: " : "Correct: ") + esc(x.q.options[x.q.answer]) + '</span></p><p class="why">' + esc(x.q.explain) + '</p></article>';
    }).join("") : '<div class="empty-note">No missed questions. Switch to all answers to re-read the explanations.</div>';
    return '<div class="wrap stack"><header><p class="eyebrow">Results · ' + (P.mode === "exam" ? "Exam" : "Study") + ' · ' + esc(scopeName(P.scope)) + '</p>' +
      '<div class="score" style="margin-top:8px"><span class="big">' + p + '%</span><span class="of">' + right.length + ' of ' + n + ' correct</span></div><p class="lede">' + verdict + '</p></header>' +
      '<section class="section"><p class="label">By section</p><div class="bars">' + bars + '</div></section>' +
      '<section class="row">' + (missed.length ? '<button class="btn primary" data-act="retry">Retry the ' + missed.length + ' missed</button>' : "") +
      '<button class="btn" data-act="again">Same set, new order</button><button class="btn ghost" data-act="topics">Choose another topic</button></section>' +
      '<section class="section"><div class="row" style="align-items:center"><h2 style="flex:2 1 200px">' + (P.showAll ? "All answers" : "Questions to review") + '</h2><button class="btn ghost" data-act="toggle">' + (P.showAll ? "Show missed only" : "Show all answers") + '</button></div><div class="rev">' + rev + '</div></section></div>';
  }

  function render(el) {
    if (el) app = el;
    var h;
    var rn = document.getElementById("rp-note"), rr = document.getElementById("rp-reason");
    if (P.report && rn) { P.report.note = rn.value; if (rr) P.report.reason = rr.value; }
    if (P.view === "pick" || !P.scope) h = pickView();
    else if (P.view === "setup") h = setupView();
    else if (P.run && P.run.done) h = resultsView();
    else if (P.run) h = questionView();
    else h = pickView();
    app.innerHTML = h;
  }

  function pickAnswer(oi) {
    var it = P.run.items[P.run.i];
    if (P.mode === "study" && it.pick !== null) return;
    it.pick = oi;
    var y = window.scrollY; render(); window.scrollTo(0, P.mode === "study" ? y : 0);
  }
  function next() {
    var r = P.run, it = r.items[r.i];
    if (it.pick === null) return;
    if (r.i === r.items.length - 1) finish(); else r.i++;
    render(); window.scrollTo(0, 0);
  }

  function onClick(e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act");
    if (a === "rep-open") { P.report = { id: b.getAttribute("data-id"), status: "form", reason: "wrong_answer", note: "" }; keepScroll(); }
    else if (a === "rep-cancel") { P.report = null; keepScroll(); }
    else if (a === "rep-send") {
      var R = P.report; if (!R || R.status === "sending") return;
      var rn = document.getElementById("rp-note"), rr = document.getElementById("rp-reason");
      R.note = rn ? rn.value.trim() : ""; R.reason = rr ? rr.value : "other"; R.status = "sending"; R.msg = "";
      keepScroll();
      DX.cloud.report(R.id, R.reason, R.note).then(function (res) {
        if (P.report !== R) return;
        if (res.ok) R.status = "sent"; else { R.status = "form"; R.msg = res.error; }
        keepScroll();
      });
    }
    else if (a === "scope") {
      P.scope = { kind: b.getAttribute("data-kind"), id: b.getAttribute("data-id") };
      P.subs = unique(scopeQs(P.scope).map(subOf)); P.count = "all"; P.view = "setup"; P.run = null;
      render(); window.scrollTo(0, 0);
    } else if (a === "sub") {
      var v = b.getAttribute("data-v"), i = P.subs.indexOf(v);
      if (i > -1) P.subs.splice(i, 1); else P.subs.push(v);
      render();
    } else if (a === "mode") { P.mode = b.getAttribute("data-v"); render(); }
    else if (a === "count") { P.count = b.getAttribute("data-v"); render(); }
    else if (a === "start") {
      var list = filtered();
      if (P.count !== "all") list = DX.shuffle(list).slice(0, parseInt(P.count, 10));
      startRun(list); render(); window.scrollTo(0, 0);
    } else if (a === "pick") pickAnswer(parseInt(b.getAttribute("data-oi"), 10));
    else if (a === "next") next();
    else if (a === "quit" || a === "topics") { P.run = null; P.view = "pick"; render(); window.scrollTo(0, 0); }
    else if (a === "toggle") { P.showAll = !P.showAll; var y = window.scrollY; render(); window.scrollTo(0, y); }
    else if (a === "retry") { startRun(P.run.items.filter(function (x) { return x.pick !== x.q.answer; }).map(function (x) { return x.q; })); render(); window.scrollTo(0, 0); }
    else if (a === "again") { startRun(P.run.items.map(function (x) { return x.q; })); render(); window.scrollTo(0, 0); }
  }
  function onKey(e) {
    if (P.view !== "run" || !P.run || P.run.done) return;
    var k = LETTERS.indexOf(e.key.toUpperCase());
    var it = P.run.items[P.run.i];
    if (e.key.length === 1 && k > -1 && k < it.order.length) pickAnswer(it.order[k]);
    else if (e.key === "Enter" && it.pick !== null) next();
  }

  DX.practice = { render: render, onClick: onClick, onKey: onKey, leave: function () {}, reset: function () { P.view = "pick"; P.run = null; } };
})();
