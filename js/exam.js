/* Phase 7 · Run 1: standalone timed examination engine. */
(function () {
  var DX = window.DX, app = null;
  var KEY = "dx.exam.active";
  var LETTERS = ["A", "B", "C", "D", "E", "F"];
  var E = { view: "setup", run: null, timer: null, count: 20, minutes: 30 };
  function esc(v) { return DX.esc(v); }
  function pool() { return (DX.questions || []).filter(function (q) { return q && q.type !== "tf" && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(Number(q.answer)) && Number(q.answer) >= 0 && Number(q.answer) < q.options.length; }); }
  function save() {
    if (!E.run || E.run.done) { DX.store.set(KEY, null); return; }
    DX.store.set(KEY, {
      startedAt: E.run.startedAt, deadline: E.run.deadline, duration: E.run.duration,
      items: E.run.items.map(function (x) { return { id: x.q.id, order: x.order, pick: x.pick, review: !!x.review }; }),
      index: E.run.index
    });
  }
  function start() {
    var all = pool(), n = E.count === "all" ? all.length : Math.min(Number(E.count), all.length);
    if (!n) return;
    var chosen = DX.shuffle(all).slice(0, n);
    E.run = {
      startedAt: Date.now(), deadline: Date.now() + E.minutes * 60000, duration: E.minutes * 60000,
      items: chosen.map(function (q) { return { q: q, order: DX.optOrder(q.options), pick: null, review: false }; }),
      index: 0, done: false, auto: false
    };
    E.view = "run"; save(); render(); clockStart();
  }
  function restore() {
    if (E.run) return;
    var s = DX.store.get(KEY, null);
    if (!s || !Array.isArray(s.items) || !s.items.length) return;
    var byId = Object.create(null);
    pool().forEach(function (q) { byId[String(q.id)] = q; });
    var items = s.items.map(function (x) {
      var q = byId[String(x.id)], order = x.order;
      if (!q || !Array.isArray(order) || order.length !== q.options.length) return null;
      var seen = Object.create(null), valid = order.every(function (v) {
        if (!Number.isInteger(v) || v < 0 || v >= q.options.length || seen[v]) return false;
        seen[v] = true; return true;
      });
      if (!valid || Object.keys(seen).length !== q.options.length) return null;
      var pick = x.pick;
      if (pick !== null && pick !== undefined && (!Number.isInteger(pick) || pick < 0 || pick >= q.options.length)) return null;
      return { q: q, order: order.slice(), pick: pick == null ? null : pick, review: !!x.review };
    });
    if (items.some(function (x) { return !x; })) { DX.store.set(KEY, null); return; }
    var index = Math.max(0, Math.min(items.length - 1, Number(s.index) || 0));
    E.run = { startedAt: Number(s.startedAt) || Date.now(), deadline: Number(s.deadline) || Date.now(),
      duration: Number(s.duration) || 1800000, items: items, index: index, done: false, auto: false };
    E.view = "run";
    if (E.run.deadline <= Date.now()) finish(true, true);
  }
  function remaining() { return E.run ? Math.max(0, E.run.deadline - Date.now()) : 0; }
  function fmt(ms) {
    var s = Math.ceil(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }
  function clockPaint() {
    var el = document.getElementById("dx-exam-clock");
    if (!el || !E.run || E.run.done) return;
    var ms = remaining(); el.textContent = fmt(ms);
    el.classList.toggle("low", ms <= 5 * 60000);
    if (ms <= 0) finish(true, true);
  }
  function clockStart() {
    clockStop();
    clockPaint();
    E.timer = window.setInterval(clockPaint, 500);
  }
  function clockStop() { if (E.timer) window.clearInterval(E.timer); E.timer = null; }
  function stats() {
    var items = E.run.items, answered = items.filter(function (x) { return x.pick !== null; });
    return { total: items.length, answered: answered.length, unanswered: items.length - answered.length,
      flagged: items.filter(function (x) { return x.review; }).length };
  }
  function setupView() {
    var total = pool().length;
    var counts = [10, 20, 40, 60].filter(function (n) { return total >= n; });
    var h = '<div class="wrap stack dx-exam"><a class="backtop" href="#home">← Home</a>' +
      '<header><p class="eyebrow">Examination centre · Run 1</p><h1>Timed examination</h1>' +
      '<p class="lede">A closed-book style MCQ session. Your answers stay hidden until you submit, and the clock continues if you leave and return.</p></header>' +
      '<section class="dx-exam-panel"><div class="dx-exam-stat"><b>' + total.toLocaleString() + '</b><span>MCQs available</span></div>' +
      '<div class="field"><label class="label" for="dx-exam-count">Number of questions</label><select id="dx-exam-count">' +
      counts.map(function (n) { return '<option value="' + n + '"' + (String(E.count) === String(n) ? ' selected' : '') + '>' + n + ' questions</option>'; }).join('') +
      '<option value="all"' + (E.count === "all" ? ' selected' : '') + '>All available · ' + total + '</option></select></div>' +
      '<div class="field"><label class="label" for="dx-exam-minutes">Time allowed</label><select id="dx-exam-minutes">' +
      [15, 30, 45, 60, 90, 120].map(function (n) { return '<option value="' + n + '"' + (E.minutes === n ? ' selected' : '') + '>' + n + ' minutes</option>'; }).join('') +
      '</select></div><p class="hint">Questions and options are shuffled for each attempt. You may leave questions unanswered and return to them before submitting.</p>' +
      '<button class="btn primary" data-exam="start"' + (total ? '' : ' disabled') + '>Begin examination</button></section>' +
      '<p class="hint">This first release uses the full MCQ bank. Subject-specific exam presets and custom question distribution are coming in Run 2.</p></div>';
    return h;
  }
  function questionView() {
    var r = E.run, it = r.items[r.index], q = it.q, s = stats();
    var opts = it.order.map(function (oi, k) {
      return '<button type="button" class="dx-exam-option' + (it.pick === oi ? ' selected' : '') + '" data-exam="answer" data-option="' + oi + '" aria-pressed="' + (it.pick === oi) + '">' +
        '<span class="k">' + LETTERS[k] + '</span><span>' + esc(q.options[oi]) + '</span></button>';
    }).join('');
    var nav = r.items.map(function (x, i) {
      var cls = 'dx-exam-nav' + (i === r.index ? ' current' : '') + (x.pick !== null ? ' answered' : '') + (x.review ? ' flagged' : '');
      return '<button type="button" class="' + cls + '" data-exam="goto" data-index="' + i + '" aria-label="Question ' + (i + 1) + (x.pick !== null ? ', answered' : ', unanswered') + (x.review ? ', marked for review' : '') + '">' + (i + 1) + '</button>';
    }).join('');
    var time = remaining();
    return '<div class="wrap stack dx-exam"><div class="dx-exam-head"><div><p class="eyebrow">Examination in progress</p><strong>Question ' + (r.index + 1) + ' of ' + s.total + '</strong></div>' +
      '<div class="dx-exam-clockbox"><small>Time remaining</small><strong id="dx-exam-clock" class="dx-exam-clock' + (time <= 300000 ? ' low' : '') + '">' + fmt(time) + '</strong></div></div>' +
      '<div class="dx-exam-progress"><i style="width:' + Math.round((s.answered / s.total) * 100) + '%"></i></div>' +
      '<div class="dx-exam-meta"><span>' + s.answered + ' answered</span><span>' + s.unanswered + ' unanswered</span><span>' + s.flagged + ' for review</span></div>' +
      '<article class="dx-exam-question"><div class="dx-exam-qtop"><span class="chip">' + esc((DX.topicById[q.topic] && DX.topicById[q.topic].name) || q.sub || 'Medical question') + '</span>' +
      '<button type="button" class="btn small ' + (it.review ? 'primary' : 'ghost') + '" data-exam="flag">' + (it.review ? '★ Marked for review' : '☆ Mark for review') + '</button></div>' +
      DX.qImg(q) + '<h2>' + esc(q.q) + '</h2><div class="dx-exam-options">' + opts + '</div></article>' +
      '<section class="dx-exam-navigation"><div class="row tight"><button class="btn ghost" data-exam="prev"' + (r.index === 0 ? ' disabled' : '') + '>Previous</button>' +
      '<button class="btn" data-exam="next"' + (r.index === s.total - 1 ? ' disabled' : '') + '>Next</button></div>' +
      '<button class="btn primary" data-exam="submit">Submit examination</button></section>' +
      '<details class="dx-exam-palette" open><summary>Question navigator · ' + s.answered + '/' + s.total + ' answered</summary><div class="dx-exam-grid">' + nav + '</div>' +
      '<p class="hint">Filled = answered · outlined star = marked for review · highlighted = current question.</p></details></div>';
  }
  function finish(auto, confirmed) {
    if (!E.run || E.run.done) return;
    if (!auto && !confirmed) {
      var s = stats();
      if (!window.confirm('Submit this examination now? ' + s.answered + ' answered, ' + s.unanswered + ' unanswered.')) return;
    }
    clockStop();
    E.run.done = true; E.run.finishedAt = Date.now(); E.run.auto = !!auto;
    var answered = E.run.items.filter(function (x) { return x.pick !== null; });
    var record = answered.map(function (x) { return { id: x.q.id, ok: x.pick === Number(x.q.answer) }; });
    if (record.length) {
      DX.record(record);
      if (DX.cloud && DX.cloud.submit) DX.cloud.submit(record);
    }
    E.view = "results"; DX.store.set(KEY, null); render();
  }
  function resultsView() {
    var r = E.run, items = r.items, answered = items.filter(function (x) { return x.pick !== null; });
    var correct = answered.filter(function (x) { return x.pick === Number(x.q.answer); });
    var pct = answered.length ? DX.pct(correct.length, answered.length) : 0;
    var missed = items.filter(function (x) { return x.pick === null || x.pick !== Number(x.q.answer); });
    var bars = {}, order = [];
    items.forEach(function (x) {
      var name = (DX.topicById[x.q.topic] && DX.topicById[x.q.topic].name) || x.q.sub || 'Other';
      if (!bars[name]) { bars[name] = { n: 0, c: 0 }; order.push(name); }
      bars[name].n++; if (x.pick !== null && x.pick === Number(x.q.answer)) bars[name].c++;
    });
    var review = items.map(function (x, i) {
      var ok = x.pick !== null && x.pick === Number(x.q.answer);
      return '<article class="dx-exam-review"><span class="st ' + (ok ? 'c' : 'm') + '">' +
        (x.pick === null ? 'Unanswered' : ok ? 'Correct' : 'Incorrect') + (x.review ? ' · Marked for review' : '') + '</span>' +
        '<p class="q">' + (i + 1) + '. ' + esc(x.q.q) + '</p>' +
        '<p class="ans">' + (x.pick === null ? '<span class="x">No answer selected</span><br>' : '<span class="x">Your answer: ' + esc(x.q.options[x.pick]) + '</span><br>') +
        '<span class="v">Correct answer: ' + esc(x.q.options[Number(x.q.answer)]) + '</span></p><p class="why">' + esc(x.q.explain || '') + '</p></article>';
    }).join('');
    var topicRows = order.map(function (name) { var b = bars[name], p = DX.pct(b.c, b.n); return '<div class="bar"><div class="meta"><span>' + esc(name) + '</span><span>' + b.c + '/' + b.n + '</span></div><div class="t"><i style="width:' + p + '%"></i></div></div>'; }).join('');
    var elapsed = Math.max(0, Math.min(r.duration, (r.finishedAt || Date.now()) - r.startedAt));
    return '<div class="wrap stack dx-exam"><header><p class="eyebrow">Examination results</p><h1>' + (r.auto ? 'Time is up' : 'Examination submitted') + '</h1>' +
      '<div class="score"><span class="big">' + pct + '%</span><span class="of">' + correct.length + ' correct of ' + answered.length + ' answered</span></div>' +
      '<p class="lede">' + answered.length + ' of ' + items.length + ' attempted · ' + (items.length - answered.length) + ' unanswered · ' + Math.floor(elapsed / 60000) + ' min ' + Math.floor((elapsed % 60000) / 1000) + ' sec used</p>' +
      '<p class="hint">Unanswered questions are not included in the percentage. They are shown separately below.</p></header>' +
      '<section class="section"><h2>Performance by topic</h2><div class="bars">' + topicRows + '</div></section>' +
      '<section class="row"><button class="btn primary" data-exam="new">Start another examination</button><a class="btn ghost" href="#home">Home</a></section>' +
      '<section class="section"><h2>Answer review · ' + missed.length + ' to revisit</h2><div class="rev">' + review + '</div></section></div>';
  }
  function render(el) {
    if (el) app = el;
    if (!app) app = document.getElementById('app');
    if (E.view !== 'results' && !E.run && DX.questions && DX.questions.length) restore();
    var html = E.view === 'results' && E.run ? resultsView() : E.run && !E.run.done ? questionView() : setupView();
    app.innerHTML = html;
    if (E.run && !E.run.done) {
      if (remaining() <= 0) finish(true, true);
      else clockStart();
    } else clockStop();
  }
  function onClick(e) {
    var b = e.target.closest('[data-exam]');
    if (!b || b.disabled || !E.run && b.getAttribute('data-exam') !== 'start') return;
    var a = b.getAttribute('data-exam');
    if (a === 'start') start();
    else if (a === 'answer') {
      var it = E.run.items[E.run.index], oi = Number(b.getAttribute('data-option'));
      if (Number.isInteger(oi) && oi >= 0 && oi < it.q.options.length) { it.pick = oi; save(); render(); }
    } else if (a === 'flag') { E.run.items[E.run.index].review = !E.run.items[E.run.index].review; save(); render(); }
    else if (a === 'goto' || a === 'prev' || a === 'next') {
      if (a === 'goto') E.run.index = Math.max(0, Math.min(E.run.items.length - 1, Number(b.getAttribute('data-index')) || 0));
      else E.run.index = Math.max(0, Math.min(E.run.items.length - 1, E.run.index + (a === 'prev' ? -1 : 1)));
      save(); render(); window.scrollTo(0, 0);
    } else if (a === 'submit') finish(false, false);
    else if (a === 'new') { E.run = null; E.view = 'setup'; render(); window.scrollTo(0, 0); }
  }
  function onChange(e) {
    if (!e.target) return;
    if (e.target.id === 'dx-exam-count') E.count = e.target.value === 'all' ? 'all' : Number(e.target.value);
    if (e.target.id === 'dx-exam-minutes') E.minutes = Math.max(1, Number(e.target.value) || 30);
  }
  function leave() { clockStop(); }
  DX.exam = { render: render, onClick: onClick, onChange: onChange, leave: leave, reset: function () { if (E.run && !E.run.done) return; E.run = null; E.view = 'setup'; } };
})();