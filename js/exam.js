/* Timed examination engine. Separate from Practice; attempts are retained locally on this device. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var KEY = "dx.exam.active", HISTORY = "dx.exam.history";
  var E = { run: null, timer: null, lastSecond: -1 };
  function fmt(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    var h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function byId() {
    var map = {}; (DX.questions || []).forEach(function (q) { if (q && q.id && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length) map[q.id] = q; }); return map;
  }
  function history() { var h = DX.store.get(HISTORY, []); return Array.isArray(h) ? h : []; }
  function clearTimer() { if (E.timer) clearInterval(E.timer); E.timer = null; }
  function save() {
    if (!E.run || E.run.done) { DX.store.set(KEY, null); return; }
    DX.store.set(KEY, { startedAt: E.run.startedAt, deadline: E.run.deadline, index: E.run.index,
      items: E.run.items.map(function (x) { return { id: x.q.id, order: x.order, pick: x.pick, flagged: x.flagged }; }) });
  }
  function restore() {
    if (E.run) return true;
    var saved = DX.store.get(KEY, null); if (!saved || !Array.isArray(saved.items) || !saved.items.length) return false;
    var map = byId(), items = [];
    for (var i = 0; i < saved.items.length; i++) {
      var x = saved.items[i], q = map[x.id];
      if (!q || !Array.isArray(x.order) || x.order.length !== q.options.length) { DX.store.set(KEY, null); return false; }
      var seen = {};
      for (var j = 0; j < x.order.length; j++) { var n = x.order[j]; if (!Number.isInteger(n) || n < 0 || n >= q.options.length || seen[n]) { DX.store.set(KEY, null); return false; } seen[n] = true; }
      if (x.pick !== null && x.pick !== undefined && (!Number.isInteger(x.pick) || x.pick < 0 || x.pick >= q.options.length)) { DX.store.set(KEY, null); return false; }
      items.push({ q: q, order: x.order.slice(), pick: x.pick == null ? null : x.pick, flagged: !!x.flagged });
    }
    E.run = { items: items, index: Math.max(0, Math.min(items.length - 1, Number(saved.index) || 0)), startedAt: Number(saved.startedAt) || Date.now(), deadline: Number(saved.deadline) || Date.now(), done: false, resumed: true };
    return true;
  }
  function start(count) {
    var pool = byId(), all = Object.keys(pool).map(function (id) { return pool[id]; });
    if (!all.length) return;
    var qs = DX.shuffle(all).slice(0, Math.min(all.length, count));
    E.run = { items: qs.map(function (q) { return { q: q, order: DX.optOrder(q.options), pick: null, flagged: false }; }),
      index: 0, startedAt: Date.now(), deadline: Date.now() + qs.length * 90 * 1000, done: false, resumed: false };
    save(); startTimer(); render();
  }
  function startTimer() {
    clearTimer();
    if (!E.run || E.run.done) return;
    tick(); E.timer = setInterval(tick, 500);
  }
  function tick() {
    if (!E.run || E.run.done) return;
    var left = Math.max(0, Math.ceil((E.run.deadline - Date.now()) / 1000));
    var node = document.getElementById("exam-clock");
    if (node && E.lastSecond !== left) { node.textContent = fmt(left); node.classList.toggle("urgent", left <= 60); E.lastSecond = left; }
    if (left <= 0) finish(true);
  }
  function summary() {
    var r = E.run, right = 0, answered = 0, flagged = 0;
    r.items.forEach(function (x) { if (x.pick !== null) { answered++; if (x.pick === x.q.answer) right++; } if (x.flagged) flagged++; });
    return { right: right, answered: answered, flagged: flagged, total: r.items.length, percent: Math.round(100 * right / r.items.length) };
  }
  function finish(auto) {
    if (!E.run || E.run.done) return;
    clearTimer(); var r = E.run, s = summary(), duration = Math.max(0, Math.min((r.deadline - r.startedAt), Math.floor((Date.now() - r.startedAt) / 1000) * 1000));
    r.done = true; r.autoSubmitted = !!auto; r.finishedAt = Date.now(); r.summary = s;
    DX.record(r.items.filter(function (x) { return x.pick !== null; }).map(function (x) { return { id: x.q.id, ok: x.pick === x.q.answer }; }));
    var rows = history(); rows.unshift({ id: "exam-" + r.finishedAt, date: r.finishedAt, total: s.total, answered: s.answered, correct: s.right, percent: s.percent, seconds: Math.round(duration / 1000), auto: !!auto });
    DX.store.set(HISTORY, rows.slice(0, 30)); DX.store.set(KEY, null); render();
  }
  function startView() {
    var saved = DX.store.get(KEY, null), count = Object.keys(byId()).length, hist = history();
    return '<div class="wrap stack exam-wrap"><header><p class="eyebrow">Examination hall</p><h1>Timed examination</h1><p class="lede">A focused MCQ paper drawn from the available question bank. Answers and explanations stay hidden until you submit.</p></header>' +
      (saved ? '<section class="exam-resume"><b>Unfinished examination found</b><p class="muted">You have an exam in progress. Your answers and remaining time were saved on this device.</p><div class="row"><button class="btn primary" data-exam="resume">Resume examination</button><button class="btn ghost" data-exam="discard">Discard and start again</button></div></section>' : '') +
      '<section class="exam-start"><p class="label">Choose paper length</p><div class="chips">' +
      [10,20,30].map(function (n) { return '<button class="chip toggle" data-exam="start" data-count="' + n + '"' + (count < n ? ' disabled' : '') + '>' + n + ' questions · ' + Math.round(n * 1.5) + ' min</button>'; }).join('') +
      '</div><p class="hint">' + count + ' eligible MCQs currently available. Each question receives 90 seconds. Questions and answer options are shuffled for each paper.</p></section>' +
      '<section class="exam-rules"><h2>Before you begin</h2><ul><li>Choose an answer, or leave a question unanswered.</li><li>Use the question navigator to move freely through the paper.</li><li>Flag questions you want to revisit.</li><li>Your progress is saved on this device if you reload or leave.</li><li>The paper submits automatically when the timer reaches zero.</li></ul></section>' +
      (hist.length ? '<section class="section"><h2>Recent examinations</h2><div class="exam-history">' + hist.slice(0,5).map(function (x) { return '<div><b>' + x.percent + '%</b><span>' + x.correct + '/' + x.total + ' correct · ' + new Date(x.date).toLocaleDateString() + '</span></div>'; }).join('') + '</div></section>' : '') +
      '<p class="hint">This first exam release saves attempts on this device. Account-wide exam history and advanced paper settings are coming in later runs.</p></div>';
  }
  function runView() {
    var r = E.run, x = r.items[r.index], q = x.q, n = r.items.length, answered = r.items.filter(function (it) { return it.pick !== null; }).length;
    var options = x.order.map(function (oi, i) { return '<button type="button" class="exam-option' + (x.pick === oi ? ' chosen' : '') + '" data-exam="answer" data-option="' + oi + '" aria-pressed="' + (x.pick === oi) + '"><span class="exam-letter">' + "ABCDE"[i] + '</span><span>' + esc(q.options[oi]) + '</span></button>'; }).join('');
    var nav = r.items.map(function (it, i) { return '<button type="button" class="exam-nav' + (i === r.index ? ' current' : '') + (it.pick !== null ? ' answered' : '') + (it.flagged ? ' flagged' : '') + '" data-exam="goto" data-index="' + i + '" aria-label="Question ' + (i + 1) + (it.pick !== null ? ', answered' : ', unanswered') + (it.flagged ? ', flagged' : '') + '">' + (i + 1) + '</button>'; }).join('');
    return '<div class="wrap stack exam-wrap"><div class="exam-top"><div><p class="eyebrow">Examination in progress</p><b>Question ' + (r.index + 1) + ' of ' + n + '</b></div><div class="exam-clock" id="exam-clock" role="timer" aria-live="off">--:--</div></div>' +
      '<div class="exam-progress"><i style="width:' + Math.round(answered / n * 100) + '%"></i></div>' +
      (r.resumed ? '<p class="note" role="status">Your examination has been restored.</p>' : '') +
      '<section class="exam-paper"><p class="exam-meta">' + esc((DX.subjectById[q.subject] && DX.subjectById[q.subject].name) || 'Medical sciences') + ' · ' + esc((DX.topicById[q.topic] && DX.topicById[q.topic].name) || q.topic) + '</p>' +
      '<h2 class="exam-question">' + esc(q.q) + '</h2>' + (q.image ? DX.qImg(q, 'exam-image') : '') + '<div class="exam-options">' + options + '</div></section>' +
      '<div class="exam-actions"><button class="btn ghost" data-exam="flag">' + (x.flagged ? '★ Flagged for review' : '☆ Mark for review') + '</button><span class="muted">' + answered + ' answered · ' + (n - answered) + ' unanswered</span></div>' +
      '<section class="exam-navpanel"><div class="exam-navhead"><b>Question navigator</b><span class="hint">Tap a number to move</span></div><div class="exam-navgrid">' + nav + '</div><div class="exam-legend"><span><i class="answered"></i> Answered</span><span><i class="flagged"></i> Flagged</span><span><i class="current"></i> Current</span></div></section>' +
      '<div class="row exam-footer"><button class="btn" data-exam="prev"' + (r.index === 0 ? ' disabled' : '') + '>Previous</button><button class="btn primary" data-exam="next"' + (r.index === n - 1 ? ' disabled' : '') + '>Next question</button><button class="btn danger" data-exam="submit">Submit paper</button></div></div>';
  }
  function resultView() {
    var r = E.run, s = r.summary, missed = r.items.filter(function (x) { return x.pick !== x.q.answer; });
    var reviews = r.items.map(function (x, i) { var ok = x.pick === x.q.answer; return '<article class="exam-review ' + (ok ? 'correct' : 'incorrect') + '"><p class="exam-meta">Question ' + (i + 1) + ' · ' + (ok ? 'Correct' : (x.pick === null ? 'Unanswered' : 'Incorrect')) + '</p><h3>' + esc(x.q.q) + '</h3><p><b>Your answer:</b> ' + esc(x.pick === null ? 'Not answered' : x.q.options[x.pick]) + '</p><p><b>Correct answer:</b> ' + esc(x.q.options[x.q.answer]) + '</p>' + (x.q.explain ? '<p class="why">' + esc(x.q.explain) + '</p>' : '') + '</article>'; }).join('');
    return '<div class="wrap stack exam-wrap"><header><p class="eyebrow">Examination result' + (r.autoSubmitted ? ' · Time expired' : '') + '</p><h1>Your result</h1><div class="exam-score"><b>' + s.percent + '%</b><span>' + s.right + ' of ' + s.total + ' correct</span></div><p class="lede">' + s.answered + ' answered · ' + (s.total - s.answered) + ' unanswered · ' + s.flagged + ' flagged</p></header>' +
      (r.autoSubmitted ? '<p class="note">Time ran out, so your paper was submitted automatically.</p>' : '') +
      '<section class="row"><button class="btn primary" data-exam="review">Review answers</button><button class="btn" data-exam="new">Start another exam</button><a class="btn ghost" href="#practice">Go to Practice</a></section>' +
      (r.showReview ? '<section class="section"><h2>Answer review</h2><div class="exam-reviews">' + reviews + '</div></section>' : '') + '</div>';
  }
  function render(el) {
    if (el) app = el; if (!app) return;
    if (!E.run || E.run.done) { if (!E.run && restore()) startTimer(); }
    if (E.run && !E.run.done) { app.innerHTML = runView(); save(); tick(); }
    else if (E.run && E.run.done) app.innerHTML = resultView();
    else app.innerHTML = startView();
  }
  function onClick(e) {
    var b = e.target.closest('[data-exam]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-exam'), r = E.run;
    if (a === 'start') start(parseInt(b.getAttribute('data-count'), 10));
    else if (a === 'resume') { if (restore()) { E.run.resumed = true; startTimer(); render(); } }
    else if (a === 'discard') { clearTimer(); E.run = null; DX.store.set(KEY, null); render(); }
    else if (a === 'answer' && r && !r.done) { r.items[r.index].pick = parseInt(b.getAttribute('data-option'), 10); save(); render(); }
    else if (a === 'flag' && r && !r.done) { r.items[r.index].flagged = !r.items[r.index].flagged; save(); render(); }
    else if (a === 'goto' && r && !r.done) { r.index = Math.max(0, Math.min(r.items.length - 1, parseInt(b.getAttribute('data-index'), 10))); save(); render(); }
    else if (a === 'prev' && r && !r.done) { r.index = Math.max(0, r.index - 1); save(); render(); }
    else if (a === 'next' && r && !r.done) { r.index = Math.min(r.items.length - 1, r.index + 1); save(); render(); }
    else if (a === 'submit' && r && !r.done) {
      var s = summary(), unanswered = s.total - s.answered;
      if (window.confirm('Submit this paper? You have answered ' + s.answered + ' of ' + s.total + ' questions' + (unanswered ? ' and left ' + unanswered + ' unanswered' : '') + '. You cannot change answers after submission.')) finish(false);
    } else if (a === 'review' && r && r.done) { r.showReview = !r.showReview; render(); }
    else if (a === 'new') { E.run = null; render(); }
  }
  function onKey(e) {
    var r = E.run; if (!r || r.done) return;
    var k = e.key.toUpperCase(), pos = 'ABCDE'.indexOf(k);
    if (pos > -1 && pos < r.items[r.index].order.length) {
      var oi = r.items[r.index].order[pos]; r.items[r.index].pick = oi; save(); render();
    } else if (e.key === 'ArrowRight') { r.index = Math.min(r.items.length - 1, r.index + 1); save(); render(); }
    else if (e.key === 'ArrowLeft') { r.index = Math.max(0, r.index - 1); save(); render(); }
  }
  function leave() { save(); clearTimer(); }
  function reset() { if (E.run && !E.run.done) return; E.run = null; clearTimer(); }
  DX.exam = { render: render, onClick: onClick, onKey: onKey, leave: leave, reset: reset };
})();