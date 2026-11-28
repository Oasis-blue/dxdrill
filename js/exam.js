/* Timed examination engine: configurable subject, topic, paper length and distribution. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var KEY = "dx.exam.active", HISTORY = "dx.exam.history", CONFIG = "dx.exam.config";
  var PRESETS = {
    basic: { label: "Basic sciences", subjects: ["anatomy", "physiology", "biochemistry"] },
    preclinical: { label: "Preclinical", subjects: ["anatomy", "physiology", "biochemistry", "behavioural", "pharmacology", "pathology"] },
    clinical: { label: "Clinical sciences", subjects: ["medicine", "surgery", "obgyn", "paediatrics", "psychiatry", "community", "family", "radiology", "ethics"] },
    full: { label: "Full curriculum", subjects: null }
  };
  var allSubjects = function () { return (DX.curriculum && DX.curriculum.subjects || []).map(function (s) { return s.id; }); };
  function defaultConfig() { return { subjects: allSubjects(), topics: [], count: 20, seconds: 90, distribution: "balanced", preset: "full" }; }
  function readConfig() {
    var c = DX.store.get(CONFIG, null), d = defaultConfig();
    if (!c || typeof c !== "object") return d;
    d.subjects = Array.isArray(c.subjects) ? c.subjects.filter(function (id) { return allSubjects().indexOf(id) > -1; }) : d.subjects;
    d.topics = Array.isArray(c.topics) ? c.topics.filter(function (id) { return !!DX.topicById[id]; }) : [];
    d.count = c.count === "all" ? "all" : Math.max(5, Math.min(200, Number(c.count) || 20));
    d.seconds = [60, 75, 90, 120].indexOf(Number(c.seconds)) > -1 ? Number(c.seconds) : 90;
    d.distribution = c.distribution === "random" ? "random" : "balanced";
    d.preset = c.preset || "custom";
    return d;
  }
  var E = { run: null, timer: null, lastSecond: -1, config: null, openSubjects: [] };
  function fmt(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    var h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    return (h ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function byId() {
    var map = {};
    (DX.questions || []).forEach(function (q) {
      if (q && q.id && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length) map[q.id] = q;
    });
    return map;
  }
  function history() { var h = DX.store.get(HISTORY, []); return Array.isArray(h) ? h : []; }
  function clearTimer() { if (E.timer) clearInterval(E.timer); E.timer = null; }
  function saveConfig() { DX.store.set(CONFIG, E.config); }
  function save() {
    if (!E.run || E.run.done) { DX.store.set(KEY, null); return; }
    DX.store.set(KEY, { startedAt: E.run.startedAt, deadline: E.run.deadline, index: E.run.index, config: E.run.config,
      items: E.run.items.map(function (x) { return { id: x.q.id, order: x.order, pick: x.pick, flagged: x.flagged }; }) });
  }
  function restore() {
    if (E.run) return true;
    var saved = DX.store.get(KEY, null);
    if (!saved || !Array.isArray(saved.items) || !saved.items.length) return false;
    var map = byId(), items = [];
    for (var i = 0; i < saved.items.length; i++) {
      var x = saved.items[i], q = map[x.id];
      if (!q || !Array.isArray(x.order) || x.order.length !== q.options.length) { DX.store.set(KEY, null); return false; }
      var seen = {};
      for (var j = 0; j < x.order.length; j++) { var n = x.order[j]; if (!Number.isInteger(n) || n < 0 || n >= q.options.length || seen[n]) { DX.store.set(KEY, null); return false; } seen[n] = true; }
      if (x.pick !== null && x.pick !== undefined && (!Number.isInteger(x.pick) || x.pick < 0 || x.pick >= q.options.length)) { DX.store.set(KEY, null); return false; }
      items.push({ q: q, order: x.order.slice(), pick: x.pick == null ? null : x.pick, flagged: !!x.flagged });
    }
    var cfg = saved.config || defaultConfig();
    if (!cfg.label) cfg.label = scopeLabel(cfg);
    if (!cfg.distribution) cfg.distribution = "balanced";
    E.run = { items: items, index: Math.max(0, Math.min(items.length - 1, Number(saved.index) || 0)),
      startedAt: Number(saved.startedAt) || Date.now(), deadline: Number(saved.deadline) || Date.now(), config: cfg, done: false, resumed: true };
    return true;
  }
  function selectedPool(cfg) {
    var subjects = cfg.subjects || [], topics = cfg.topics || [], map = byId();
    return Object.keys(map).map(function (id) { return map[id]; }).filter(function (q) {
      return subjects.indexOf(q.subject) > -1 && (!topics.length || topics.indexOf(q.topic) > -1);
    });
  }
  function groupedPool(pool) {
    var groups = {};
    pool.forEach(function (q) { (groups[q.topic] || (groups[q.topic] = [])).push(q); });
    Object.keys(groups).forEach(function (id) { groups[id] = DX.shuffle(groups[id]); });
    return groups;
  }
  function makePaper(pool, count, distribution) {
    var n = count === "all" ? pool.length : Math.min(pool.length, Number(count) || 20);
    if (distribution !== "balanced") return DX.shuffle(pool).slice(0, n);
    var groups = groupedPool(pool), keys = DX.shuffle(Object.keys(groups)), result = [];
    while (result.length < n) {
      var added = false;
      keys.forEach(function (key) { if (result.length < n && groups[key].length) { result.push(groups[key].pop()); added = true; } });
      if (!added) break;
    }
    return result;
  }
  function scopeLabel(cfg) {
    var subjects = DX.curriculum.subjects.filter(function (s) { return cfg.subjects.indexOf(s.id) > -1; });
    var names = subjects.map(function (s) { return s.name; });
    if (cfg.topics.length) return cfg.topics.length + " selected topics · " + names.join(", ");
    if (subjects.length === allSubjects().length) return "Full curriculum";
    return names.join(", ");
  }
  function start() {
    var cfg = E.config, pool = selectedPool(cfg);
    if (!pool.length) return;
    var qs = makePaper(pool, cfg.count, cfg.distribution);
    if (!qs.length) return;
    var duration = qs.length * cfg.seconds * 1000;
    E.run = { items: qs.map(function (q) { return { q: q, order: DX.optOrder(q.options), pick: null, flagged: false }; }),
      index: 0, startedAt: Date.now(), deadline: Date.now() + duration, duration: duration,
      config: { subjects: cfg.subjects.slice(), topics: cfg.topics.slice(), count: cfg.count, seconds: cfg.seconds, distribution: cfg.distribution, label: scopeLabel(cfg) },
      done: false, resumed: false };
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
    clearTimer(); var r = E.run, s = summary(), duration = Math.max(0, Math.min(r.duration || (r.deadline - r.startedAt), Math.floor((Date.now() - r.startedAt) / 1000) * 1000));
    r.done = true; r.autoSubmitted = !!auto; r.finishedAt = Date.now(); r.summary = s;
    DX.record(r.items.filter(function (x) { return x.pick !== null; }).map(function (x) { return { id: x.q.id, ok: x.pick === x.q.answer }; }));
    var rows = history(); rows.unshift({ id: "exam-" + r.finishedAt, date: r.finishedAt, total: s.total, answered: s.answered,
      correct: s.right, percent: s.percent, seconds: Math.round(duration / 1000), auto: !!auto, scope: r.config.label,
      distribution: r.config.distribution });
    DX.store.set(HISTORY, rows.slice(0, 30)); DX.store.set(KEY, null); render();
  }
  function setPreset(id) {
    var p = PRESETS[id]; if (!p) return;
    E.config.subjects = p.subjects ? p.subjects.slice() : allSubjects();
    E.config.topics = []; E.config.preset = id; saveConfig(); render();
  }
  function toggleSubject(id) {
    var a = E.config.subjects.slice(), i = a.indexOf(id);
    if (i > -1) a.splice(i, 1); else a.push(id);
    E.config.subjects = a; E.config.topics = E.config.topics.filter(function (tid) {
      var t = DX.topicById[tid]; return t && a.indexOf(t.subject) > -1;
    });
    E.config.preset = "custom"; saveConfig(); render();
  }
  function toggleTopic(id) {
    var holder = app && app.querySelector(".exam-topic[data-topic=\"" + id + "\"]");
    var details = holder && holder.closest(".exam-topic-details");
    var openId = details && details.getAttribute("data-subject");
    if (openId && E.openSubjects.indexOf(openId) < 0) E.openSubjects.push(openId);
    var a = E.config.topics.slice(), i = a.indexOf(id);
    if (i > -1) a.splice(i, 1); else a.push(id);
    E.config.topics = a; E.config.preset = "custom"; saveConfig(); render();
  }
  function configView() {
    var cfg = E.config, subjects = DX.curriculum.subjects, pool = selectedPool(cfg), max = pool.length;
    var countOptions = [5, 10, 20, 30, 40, 60].filter(function (n) { return n <= max; }).map(function (n) {
      return '<option value="' + n + '"' + (String(cfg.count) === String(n) ? ' selected' : '') + '>' + n + ' questions</option>';
    }).join("");
    countOptions += '<option value="all"' + (cfg.count === "all" ? ' selected' : '') + '>All available · ' + max + '</option>';
    var subjectHtml = subjects.map(function (s) {
      var n = DX.subjectCount(s.id) || 0, chosen = cfg.subjects.indexOf(s.id) > -1;
      var topicButtons = s.areas.map(function (a) {
        var available = a.topics.filter(function (t) { return t.count > 0; });
        if (!available.length) return "";
        return '<div class="exam-config-area"><b>' + esc(a.name) + '</b><div class="exam-topic-grid">' + available.map(function (t) {
          var active = cfg.topics.indexOf(t.id) > -1;
          return '<button type="button" class="exam-topic' + (active ? ' selected' : '') + '" data-exam="topic" data-topic="' + esc(t.id) + '" aria-pressed="' + active + '">' +
            '<span>' + esc(t.name) + '</span><small>' + t.count + '</small></button>';
        }).join("") + '</div></div>';
      }).join("");
      return '<div class="exam-subject-block"><button type="button" class="exam-subject' + (chosen ? ' selected' : '') + '" data-exam="subject" data-subject="' + esc(s.id) + '" aria-pressed="' + chosen + '">' +
        '<span><b>' + esc(s.name) + '</b><small>' + n + ' MCQs</small></span><span class="exam-check">' + (chosen ? '✓' : '+') + '</span></button>' +
        (chosen ? '<details class="exam-topic-details" data-subject="' + esc(s.id) + '"' + (E.openSubjects.indexOf(s.id) > -1 ? ' open' : '') + '><summary>Choose topics in ' + esc(s.name) + '</summary>' + topicButtons + '</details>' : '') + '</div>';
    }).join("");
    var presets = Object.keys(PRESETS).map(function (id) {
      return '<button type="button" class="exam-preset' + (cfg.preset === id ? ' active' : '') + '" data-exam="preset" data-preset="' + id + '">' +
        '<b>' + esc(PRESETS[id].label) + '</b><small>' + (PRESETS[id].subjects ? PRESETS[id].subjects.length + ' subjects' : 'Every curriculum subject') + '</small></button>';
    }).join("");
    return '<section class="exam-config"><div class="exam-config-heading"><div><p class="eyebrow">Build your paper</p><h2>Choose your examination</h2></div><span class="exam-available">' + max + ' available MCQs</span></div>' +
      '<div class="exam-config-group"><h3>Quick presets</h3><div class="exam-preset-grid">' + presets + '</div></div>' +
      '<div class="exam-config-group"><div class="exam-config-heading"><h3>Subjects</h3><button type="button" class="exam-text-btn" data-exam="all-subjects">Select all</button></div><div class="exam-subject-grid">' + subjectHtml + '</div></div>' +
      '<div class="exam-config-group"><div class="exam-config-heading"><h3>Topic selection</h3><button type="button" class="exam-text-btn" data-exam="clear-topics">Clear topic filters</button></div>' +
      '<p class="hint">' + (cfg.topics.length ? cfg.topics.length + ' selected topics. Only questions from these topics will be used.' : 'No topic filter applied: all available topics within your selected subjects are included.') + '</p></div>' +
      '<div class="exam-config-row"><label>Paper length<select id="exam-count">' + countOptions + '</select></label>' +
      '<label>Time per question<select id="exam-seconds">' + [60,75,90,120].map(function (n) { return '<option value="' + n + '"' + (cfg.seconds === n ? ' selected' : '') + '>' + n + ' seconds</option>'; }).join("") + '</select></label></div>' +
      '<div class="exam-config-group"><h3>Question distribution</h3><div class="exam-distribution">' +
      '<button type="button" data-exam="distribution" data-value="balanced" class="' + (cfg.distribution === "balanced" ? 'active' : '') + '"><b>Balanced by topic</b><small>Spread questions as evenly as possible across selected topics.</small></button>' +
      '<button type="button" data-exam="distribution" data-value="random" class="' + (cfg.distribution === "random" ? 'active' : '') + '"><b>Fully random</b><small>Randomly sample from all eligible questions.</small></button></div></div>' +
      '<div class="exam-config-summary"><div><b>' + max + '</b><span>eligible questions</span></div><div><b>' + (cfg.count === "all" ? max : Math.min(Number(cfg.count), max)) + '</b><span>in this paper</span></div><div><b>' + Math.ceil((cfg.count === "all" ? max : Math.min(Number(cfg.count), max)) * cfg.seconds / 60) + ' min</b><span>time allowed</span></div></div>' +
      '<button type="button" class="btn primary exam-begin" data-exam="start"' + (!max ? ' disabled' : '') + '>Begin examination</button>' +
      (!max ? '<p class="note">No eligible MCQs match this selection yet. Choose another subject or clear the topic filters.</p>' : '') + '</section>';
  }
  function startView() {
    var saved = DX.store.get(KEY, null), hist = history();
    return '<div class="wrap stack exam-wrap"><header><p class="eyebrow">Examination hall</p><h1>Timed examination</h1><p class="lede">Build a paper from the MDCN curriculum. Choose subjects, narrow it to specific topics, set the paper length and time allowance, then begin.</p></header>' +
      (saved ? '<section class="exam-resume"><b>Unfinished examination found</b><p class="muted">Your paper, selected subjects and topics, answers and remaining time were saved on this device.</p><div class="row"><button class="btn primary" data-exam="resume">Resume examination</button><button class="btn ghost" data-exam="discard">Discard and start again</button></div></section>' : '') +
      configView() +
      '<section class="exam-rules"><h2>How question selection works</h2><ul><li>Balanced mode spreads questions across the selected topics as evenly as possible.</li><li>Random mode samples freely from all eligible questions.</li><li>Questions and answer options are shuffled for each attempt.</li><li>Only topics that currently contain MCQs are available to select.</li></ul></section>' +
      (hist.length ? '<section class="section"><h2>Recent examinations</h2><div class="exam-history">' + hist.slice(0,5).map(function (x) { return '<div><b>' + x.percent + '%</b><span>' + esc(x.scope || 'Full curriculum') + ' · ' + x.correct + '/' + x.total + ' correct · ' + new Date(x.date).toLocaleDateString() + '</span></div>'; }).join('') + '</div></section>' : '') + '</div>';
  }
  function runView() {
    var r = E.run, x = r.items[r.index], q = x.q, n = r.items.length, answered = r.items.filter(function (it) { return it.pick !== null; }).length;
    var options = x.order.map(function (oi, i) { return '<button type="button" class="exam-option' + (x.pick === oi ? ' chosen' : '') + '" data-exam="answer" data-option="' + oi + '" aria-pressed="' + (x.pick === oi) + '"><span class="exam-letter">' + "ABCDEF"[i] + '</span><span>' + esc(q.options[oi]) + '</span></button>'; }).join('');
    var nav = r.items.map(function (it, i) { return '<button type="button" class="exam-nav' + (i === r.index ? ' current' : '') + (it.pick !== null ? ' answered' : '') + (it.flagged ? ' flagged' : '') + '" data-exam="goto" data-index="' + i + '" aria-label="Question ' + (i + 1) + (it.pick !== null ? ', answered' : ', unanswered') + (it.flagged ? ', flagged' : '') + '">' + (i + 1) + '</button>'; }).join('');
    return '<div class="wrap stack exam-wrap"><div class="exam-top"><div><p class="eyebrow">Examination in progress</p><b>' + esc(r.config.label) + ' · Question ' + (r.index + 1) + ' of ' + n + '</b></div><div class="exam-clock" id="exam-clock" role="timer" aria-live="off">--:--</div></div>' +
      '<div class="exam-progress"><i style="width:' + Math.round(answered / n * 100) + '%"></i></div>' +
      (r.resumed ? '<p class="note" role="status">Your examination has been restored.</p>' : '') +
      '<section class="exam-paper"><p class="exam-meta">' + esc((DX.subjectById[q.subject] && DX.subjectById[q.subject].name) || 'Medical sciences') + ' · ' + esc((DX.topicById[q.topic] && DX.topicById[q.topic].name) || q.topic) + '</p>' +
      '<h2 class="exam-question">' + esc(q.q) + '</h2>' + (q.image ? DX.qImg(q, 'exam-image') : '') + '<div class="exam-options">' + options + '</div></section>' +
      '<div class="exam-actions"><button class="btn ghost" data-exam="flag">' + (x.flagged ? '★ Flagged for review' : '☆ Mark for review') + '</button><span class="muted">' + answered + ' answered · ' + (n - answered) + ' unanswered</span></div>' +
      '<section class="exam-navpanel"><div class="exam-navhead"><b>Question navigator</b><span class="hint">Tap a number to move</span></div><div class="exam-navgrid">' + nav + '</div><div class="exam-legend"><span><i class="answered"></i> Answered</span><span><i class="flagged"></i> Flagged</span><span><i class="current"></i> Current</span></div></section>' +
      '<div class="row exam-footer"><button class="btn" data-exam="prev"' + (r.index === 0 ? ' disabled' : '') + '>Previous</button><button class="btn primary" data-exam="next"' + (r.index === n - 1 ? ' disabled' : '') + '>Next question</button><button class="btn danger" data-exam="submit">Submit paper</button></div></div>';
  }
  function resultView() {
    var r = E.run, s = r.summary;
    var reviews = r.items.map(function (x, i) {
      var ok = x.pick === x.q.answer;
      return '<article class="exam-review ' + (ok ? 'correct' : 'incorrect') + '"><p class="exam-meta">Question ' + (i + 1) + ' · ' + (ok ? 'Correct' : (x.pick === null ? 'Unanswered' : 'Incorrect')) + '</p><h3>' + esc(x.q.q) + '</h3><p><b>Your answer:</b> ' + esc(x.pick === null ? 'Not answered' : x.q.options[x.pick]) + '</p><p><b>Correct answer:</b> ' + esc(x.q.options[x.q.answer]) + '</p>' + (x.q.explain ? '<p class="why">' + esc(x.q.explain) + '</p>' : '') + '</article>';
    }).join('');
    return '<div class="wrap stack exam-wrap"><header><p class="eyebrow">Examination result' + (r.autoSubmitted ? ' · Time expired' : '') + '</p><h1>Your result</h1><div class="exam-score"><b>' + s.percent + '%</b><span>' + s.right + ' of ' + s.total + ' correct</span></div><p class="lede">' + s.answered + ' answered · ' + (s.total - s.answered) + ' unanswered · ' + s.flagged + ' flagged</p><p class="hint">' + esc(r.config.label) + ' · ' + (r.config.distribution === 'balanced' ? 'Balanced by topic' : 'Fully random') + '</p></header>' +
      (r.autoSubmitted ? '<p class="note">Time ran out, so your paper was submitted automatically.</p>' : '') +
      '<section class="row"><button class="btn primary" data-exam="review">Review answers</button><button class="btn" data-exam="new">Build another exam</button><a class="btn ghost" href="#practice">Go to Practice</a></section>' +
      (r.showReview ? '<section class="section"><h2>Answer review</h2><div class="exam-reviews">' + reviews + '</div></section>' : '') + '</div>';
  }
  function render(el) {
    if (el) app = el; if (!app) return;
    if (!E.config) E.config = readConfig();
    if (E.run && !E.run.done) { if (!E.timer) startTimer(); app.innerHTML = runView(); E.run.resumed = false; save(); tick(); }
    else if (E.run && E.run.done) app.innerHTML = resultView();
    else app.innerHTML = startView();
  }
  function onClick(e) {
    var b = e.target.closest('[data-exam]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-exam'), r = E.run;
    if (a === 'start' && !r) start();
    else if (a === 'preset' && !r) setPreset(b.getAttribute('data-preset'));
    else if (a === 'subject' && !r) toggleSubject(b.getAttribute('data-subject'));
    else if (a === 'topic' && !r) toggleTopic(b.getAttribute('data-topic'));
    else if (a === 'all-subjects' && !r) { E.config.subjects = allSubjects(); E.config.topics = []; E.config.preset = 'full'; saveConfig(); render(); }
    else if (a === 'clear-topics' && !r) { E.config.topics = []; saveConfig(); render(); }
    else if (a === 'distribution' && !r) { E.config.distribution = b.getAttribute('data-value') === 'random' ? 'random' : 'balanced'; saveConfig(); render(); }
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
  function onInput(e) {
    if (!e.target) return;
    if (e.target.id === 'exam-count') {
      E.config.count = e.target.value === 'all' ? 'all' : Number(e.target.value);
      saveConfig(); render();
    } else if (e.target.id === 'exam-seconds') {
      E.config.seconds = Number(e.target.value) || 90; saveConfig(); render();
    }
  }
  function onKey(e) {
    var r = E.run; if (!r || r.done) return;
    var k = e.key.toUpperCase(), pos = 'ABCDEF'.indexOf(k);
    if (pos > -1 && pos < r.items[r.index].order.length) {
      var oi = r.items[r.index].order[pos]; r.items[r.index].pick = oi; save(); render();
    } else if (e.key === 'ArrowRight') { r.index = Math.min(r.items.length - 1, r.index + 1); save(); render(); }
    else if (e.key === 'ArrowLeft') { r.index = Math.max(0, r.index - 1); save(); render(); }
  }
  function leave() { save(); clearTimer(); }
  function reset() { if (E.run && !E.run.done) return; E.run = null; clearTimer(); }
  DX.exam = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave, reset: reset };
})();