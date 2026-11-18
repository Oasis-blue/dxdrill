/* Hall mode: one screen, a quizmaster, teams and five kinds of round. No backend needed. */
(function () {
  var DX = window.DX, esc = DX.esc, app;
  var LETTERS = ["A", "B", "C", "D", "E", "F"];

  var DEF = {
    rapid:    { secs: 60, pts: 1, pen: 0, show: 0 },
    board:    { tiles: 12, secs: 30, pts: 2, steal: 1, show: 1 },
    all:      { n: 10, secs: 20, pts: 1, show: 1 },
    describe: { n: 8, secs: 45 },
    explain:  { secs: 60, pts: 1, foul: 1 }
  };
  var META = {
    rapid: { name: "Rapid fire", desc: "Every team gets the same time on the clock. Say the answer or say skip. The quizmaster taps Got, Missed or Skip.",
      fields: [["secs", "Seconds per team", "num", 15, 300], ["pts", "Points per correct", "num", 1, 10], ["pen", "Penalty per miss", "num", 0, 10], ["show", "Answer format", "fmt"]] },
    board: { name: "Question board", desc: "Teams take turns choosing a tile. Used tiles are gone. A missed question can be stolen by the next team for half points.",
      fields: [["tiles", "Tiles on the board", "num", 4, 30], ["secs", "Seconds per question", "num", 10, 120], ["pts", "Points per correct", "num", 1, 10], ["steal", "Next team can steal", "bool"], ["show", "Answer format", "fmt"]] },
    all: { name: "Everyone answers", desc: "All teams answer the same question at the same time. The quizmaster ticks the teams that got it right.",
      fields: [["n", "Number of questions", "num", 3, 30], ["secs", "Seconds per question", "num", 5, 120], ["pts", "Points per correct", "num", 1, 10], ["show", "Answer format", "fmt"]] },
    describe: { name: "Describe it", desc: "The screen gives clues for a medical term, from vague to easy. The earlier a team guesses, the more points it earns.",
      fields: [["n", "Number of terms", "num", 3, 20], ["secs", "Seconds per term (0 for no clock)", "num", 0, 180]] },
    explain: { name: "Explain it", desc: "One player explains the term to teammates without using the listed words. Each team gets the same time. Got, Skip or Foul.",
      fields: [["secs", "Seconds per team", "num", 15, 300], ["pts", "Points per correct", "num", 1, 10], ["foul", "Penalty per foul", "num", 0, 10]] }
  };

  var H = { view: "setup", teams: null, scope: "all", used: {}, cfg: null, pick: null, edit: false, note: "" };
  var R = null;

  /* ---------- state ---------- */
  function init() {
    if (H.teams) return;
    var t = DX.store.get("dx.hall.teams", null);
    H.teams = (t && t.length >= 2) ? t : [1, 2, 3, 4].map(function (n) { return { name: "Team " + n, cls: "", score: 0 }; });
    var names = DX.store.get("dx.classnames", {});
    DX.curriculum.classes.forEach(function (k) { if (typeof names[k.id] === "string" && names[k.id] && !k.name) k.name = names[k.id]; });
    var c = DX.store.get("dx.hall.cfg", {});
    H.cfg = {};
    Object.keys(DEF).forEach(function (k) { H.cfg[k] = Object.assign({}, DEF[k], c[k] || {}); });
  }
  function save() { DX.store.set("dx.hall.teams", H.teams); DX.store.set("dx.hall.cfg", H.cfg); }

  function inScope(x) {
    if (H.scope === "all") return true;
    var k = H.scope.slice(0, 2), id = H.scope.slice(2);
    return k === "s:" ? x.subject === id : x.topic === id;
  }
  function poolQs(mode) { return DX.questions.filter(function (q) { return inScope(q) && (mode !== 0 || q.open); }); }
  function poolTerms() { var t = DX.terms.filter(inScope); return t.length ? t : DX.terms; }
  function drawFrom(all, keyOf, n) {
    var free = all.filter(function (x) { return !H.used[keyOf(x)]; });
    if (free.length < n) { all.forEach(function (x) { delete H.used[keyOf(x)]; }); free = all.slice(); H.note = "The selection ran out of fresh items, so some may repeat."; }
    var pick = DX.shuffle(free).slice(0, n);
    pick.forEach(function (x) { H.used[keyOf(x)] = 1; });
    return pick;
  }
  function drawQ(n, mode) { return drawFrom(poolQs(mode), function (q) { return "q" + q.id; }, n); }
  function drawT(n) { return drawFrom(poolTerms(), function (t) { return "t" + t.term; }, n); }
  /* mode: 1 = always options, 0 = no options (open-answer questions only), 2 = mixed (options-only questions keep their options, the rest are a coin toss) */
  function wrapQ(q, mode) {
    var opts = mode === 1 || !q.open || (mode === 2 && Math.random() < 0.5);
    return { q: q, opts: opts, order: DX.shuffle(q.options.map(function (_, i) { return i; })) };
  }
  function wrapper(mode) { return function (q) { return wrapQ(q, mode); }; }
  function subOf(q) { return q.sub || DX.topicById[q.topic].name; }

  /* ---------- timer ---------- */
  var TM = { left: 0, total: 0, t: null, last: 0, running: false, onEnd: null, lastSec: -1 };
  var ac = null;
  function beep(f, d) {
    if (!DX.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; g.gain.value = 0.12; o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + d);
    } catch (e) { /* audio can be blocked */ }
  }
  function tmStop() { TM.running = false; clearInterval(TM.t); TM.t = null; }
  function tmSet(sec, onEnd) { tmStop(); TM.total = sec * 1000; TM.left = TM.total; TM.onEnd = onEnd; TM.lastSec = -1; }
  function tmClear() { tmStop(); TM.total = 0; TM.left = 0; TM.onEnd = null; }
  function tmStart() { if (TM.running || TM.left <= 0) return; TM.running = true; TM.last = performance.now(); TM.t = setInterval(tmTick, 100); tmPaint(); }
  function tmTick() {
    var n = performance.now(); TM.left -= n - TM.last; TM.last = n;
    var s = Math.ceil(TM.left / 1000);
    if (s !== TM.lastSec) { TM.lastSec = s; if (s <= 5 && s > 0) beep(660, 0.08); }
    if (TM.left <= 0) {
      TM.left = 0; tmStop(); beep(440, 0.5);
      var f = TM.onEnd; TM.onEnd = null; if (f) f(); else tmPaint();
      return;
    }
    tmPaint();
  }
  function tmPaint() {
    var v = document.getElementById("tmv"), b = document.getElementById("tmb"), w = document.getElementById("tm");
    if (v) v.textContent = Math.ceil(TM.left / 1000);
    if (b) b.style.width = (TM.total ? 100 * TM.left / TM.total : 0) + "%";
    if (w) w.classList.toggle("low", TM.total > 0 && TM.left <= 5000);
  }
  function tmPause() { if (TM.running) { tmStop(); } else { tmStart(); } paint(); }
  function timerHTML() { return '<div class="timer" id="tm" role="timer" aria-live="off"><i id="tmb"></i><span id="tmv"></span></div>'; }

  /* ---------- shared pieces ---------- */
  function clsLabel(id) {
    var c = DX.curriculum.classes.filter(function (x) { return x.id === id; })[0];
    return c ? c.label + (c.name ? " · " + c.name : "") : "";
  }
  function scoreboard(active, edit) {
    return '<div class="scoreboard" aria-label="Scores">' + H.teams.map(function (t, i) {
      return '<div class="team' + (i === active ? " active" : "") + '"><span class="tn">' + esc(t.name) + '</span>' +
        (t.cls ? '<span class="tc">' + esc(clsLabel(t.cls)) + '</span>' : "") +
        '<span class="ts">' + t.score + '</span>' +
        (edit ? '<span class="adj"><button data-act="adj" data-i="' + i + '" data-d="-1" aria-label="Minus one for ' + esc(t.name) + '">−1</button><button data-act="adj" data-i="' + i + '" data-d="1" aria-label="Plus one for ' + esc(t.name) + '">+1</button></span>' : "") + '</div>';
    }).join("") + '</div>';
  }
  function shell(inner, active) {
    return '<div class="wrap wide stack">' + scoreboard(active, false) + '<section class="stage">' + inner + '</section></div>';
  }
  function answerBox(w) {
    var q = w.q, letter = w.opts ? LETTERS[w.order.indexOf(q.answer)] + ". " : "";
    var text = (!w.opts && q.open && q.open.a) ? q.open.a : q.options[q.answer];
    var also = (!w.opts && q.open && q.open.accept && q.open.accept.length) ? '<p class="also"><span class="label">Also accept</span> ' + q.open.accept.map(esc).join(" · ") + '</p>' : "";
    return '<div class="answerbox"><p class="label">Answer</p><p class="a">' + letter + esc(text) + '</p>' + also + '<p class="e">' + esc(q.explain) + '</p></div>';
  }
  function qBlock(w, _unused, reveal) {
    var h = '<div class="chips"><span class="chip">' + esc(subOf(w.q)) + '</span>' + (w.opts ? "" : '<span class="chip">No options</span>') + '</div><p class="qbig">' + esc(w.opts ? w.q.q : w.q.open.q) + '</p>';
    if (w.opts) {
      h += '<div class="opts big">' + w.order.map(function (oi, k) {
        var cls = "opt" + (reveal && oi === w.q.answer ? " correct" : "");
        return '<div class="' + cls + '"><span class="k">' + LETTERS[k] + '</span><span>' + esc(w.q.options[oi]) + '</span></div>';
      }).join("") + '</div>';
    }
    if (reveal) h += answerBox(w);
    return h;
  }
  function marks(list) {
    return '<div class="marks">' + list.map(function (m) {
      return '<button class="btn ' + m[2] + '" data-act="mark" data-v="' + m[0] + '">' + m[1] + '</button>';
    }).join("") + '</div>';
  }
  function utilRow(reveal, pausable) {
    var h = '<div class="row tight">';
    if (reveal !== null) h += '<button class="btn small" data-act="reveal">' + (reveal ? "Hide answer" : "Show answer") + ' <kbd>R</kbd></button>';
    if (pausable) h += '<button class="btn small" data-act="pause">' + (TM.running ? "Pause" : "Resume") + ' <kbd>Space</kbd></button>';
    return h + '</div>';
  }
  function paint() { app.innerHTML = view(); tmPaint(); }

  /* ---------- setup ---------- */
  function scopeOptions() {
    var o = '<option value="all"' + (H.scope === "all" ? " selected" : "") + '>Everything (' + DX.questions.length + ' questions)</option>';
    DX.curriculum.subjects.forEach(function (s) {
      var sc = DX.subjectCount(s.id);
      if (!sc) return;
      o += '<option value="s:' + s.id + '"' + (H.scope === "s:" + s.id ? " selected" : "") + '>' + esc(s.name) + ' (' + sc + ')</option>';
      s.areas.forEach(function (a) {
        a.topics.forEach(function (t) {
          if (t.count) o += '<option value="t:' + t.id + '"' + (H.scope === "t:" + t.id ? " selected" : "") + '>— ' + esc(a.name) + ': ' + esc(t.name) + ' (' + t.count + ')</option>';
        });
      });
    });
    return o;
  }
  function classOptions(sel) {
    return '<option value="">Class (optional)</option>' + DX.curriculum.classes.map(function (c) {
      return '<option value="' + c.id + '"' + (sel === c.id ? " selected" : "") + '>' + esc(c.label + (c.name ? " · " + c.name : "") + " · " + c.level) + '</option>';
    }).join("");
  }
  function scopeHint() {
    return poolQs().length + " questions and " + poolTerms().length + " terms in this selection.";
  }
  function setupView() {
    return '<div class="wrap stack"><header><p class="eyebrow">Hall mode</p><h1>Set up the session</h1>' +
      '<p class="lede">One screen for the whole room. The quizmaster runs everything from this page. Open it on a laptop connected to the projector.</p></header>' +
      '<section class="section"><p class="label">Teams</p>' + H.teams.map(function (t, i) {
        return '<div class="teamrow"><div class="field"><input type="text" data-team="' + i + '" data-f="name" value="' + esc(t.name) + '" maxlength="30" aria-label="Name of team ' + (i + 1) + '"></div>' +
          '<div class="field"><select data-team="' + i + '" data-f="cls" aria-label="Class of team ' + (i + 1) + '">' + classOptions(t.cls) + '</select></div></div>';
      }).join("") +
      '<div class="row tight"><button class="btn small" data-act="addteam"' + (H.teams.length >= 8 ? " disabled" : "") + '>Add a team</button><button class="btn small ghost" data-act="rmteam"' + (H.teams.length <= 2 ? " disabled" : "") + '>Remove last team</button></div></section>' +
      '<details class="section classnames"><summary class="label">Class names</summary><p class="hint">Rename a class here. The change is saved in this browser. Once accounts are added, an admin will edit these for everyone.</p>' +
        DX.curriculum.classes.map(function (c) {
          return '<div class="teamrow"><div class="field"><label class="label" for="cn-' + c.id + '">' + esc(c.label) + ' · ' + esc(c.level) + '</label><input type="text" id="cn-' + c.id + '" data-clsname="' + c.id + '" value="' + esc(c.name) + '" placeholder="Class name (not set yet)" maxlength="30"></div></div>';
        }).join("") + '</details>' +
      '<section class="section"><div class="field"><label class="label" for="scope">Questions and terms from</label><select id="scope" data-f="scope">' + scopeOptions() + '</select></div><p class="hint" id="scopehint">' + scopeHint() + '</p></section>' +
      '<section class="row"><button class="btn primary" data-act="begin">Start session</button></section></div>';
  }

  /* ---------- menu ---------- */
  function fieldHTML(type, f) {
    var v = H.cfg[type][f[0]], id = "f-" + type + "-" + f[0];
    if (f[2] === "fmt") return '<div class="field"><label class="label" for="' + id + '">' + f[1] + '</label><select id="' + id + '" data-cfg="' + type + '" data-k="' + f[0] + '" data-fmt="1">' +
      [[1, "Always show options"], [0, "No options (open answers)"], [2, "Mixed"]].map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select></div>';
    if (f[2] === "bool") return '<label class="checkline" for="' + id + '"><input type="checkbox" id="' + id + '" data-cfg="' + type + '" data-k="' + f[0] + '"' + (v ? " checked" : "") + '><span>' + f[1] + '</span></label>';
    return '<div class="field"><label class="label" for="' + id + '">' + f[1] + '</label><input type="number" id="' + id + '" data-cfg="' + type + '" data-k="' + f[0] + '" min="' + f[3] + '" max="' + f[4] + '" value="' + v + '"></div>';
  }
  function menuView() {
    var cards = Object.keys(META).map(function (k) {
      var m = META[k], on = H.pick === k;
      return '<article class="card"' + (on ? ' style="border-color:var(--accent)"' : "") + '><h3>' + m.name + '</h3><p>' + m.desc + '</p><button class="btn' + (on ? " primary" : "") + '" data-act="choose" data-r="' + k + '">' + (on ? "Selected" : "Choose") + '</button></article>';
    }).join("");
    var panel = "";
    if (H.pick) {
      var m = META[H.pick];
      panel = '<section class="stage"><h2>' + m.name + ' settings</h2><div class="settings">' + m.fields.map(function (f) { return fieldHTML(H.pick, f); }).join("") + '</div>' +
        '<div class="row tight"><button class="btn primary" data-act="launch">Start ' + m.name.toLowerCase() + '</button></div>' +
        '<p class="hint">Shortcuts during a round: <kbd>G</kbd> got, <kbd>M</kbd> missed, <kbd>S</kbd> skip, <kbd>F</kbd> foul, <kbd>R</kbd> show answer, <kbd>N</kbd> next clue, <kbd>Space</kbd> pause.</p></section>';
    }
    return '<div class="wrap wide stack"><header><p class="eyebrow">Hall mode</p><h1>Choose a round</h1>' + (H.note ? '<p class="lede">' + esc(H.note) + '</p>' : '<p class="lede">' + scopeHint() + '</p>') + '</header>' +
      scoreboard(-1, H.edit) +
      '<div class="row tight"><button class="btn small" data-act="edit">' + (H.edit ? "Done adjusting scores" : "Adjust scores") + '</button><button class="btn small ghost" data-act="setup">Change teams or topics</button><button class="btn small ghost" data-act="final">End session and show standings</button></div>' +
      '<section class="cards">' + cards + '</section>' + panel + '</div>';
  }

  /* ---------- rounds: launch ---------- */
  function launch() {
    var t = H.pick; if (!t) return;
    H.note = "";
    if (!DX.questions.length && t !== "describe" && t !== "explain") return;
    if (t === "rapid") R = { type: "rapid", c: H.cfg.rapid, team: 0, phase: "ready", queue: [], cur: null, rev: false, got: 0, miss: 0, skip: 0 };
    if (t === "board") {
      var c = H.cfg.board, qs = drawQ(c.tiles, c.show);
      R = { type: "board", c: c, tiles: qs.map(function (q) { return { w: wrapQ(q, c.show), st: "open" }; }), team: 0, ans: 0, phase: "pick", ti: -1, attempt: 0, rev: false, timeup: false, last: null };
    }
    if (t === "all") {
      var c2 = H.cfg.all;
      R = { type: "all", c: c2, qs: drawQ(c2.n, c2.show).map(wrapper(c2.show)), i: 0, phase: "q", rev: false, right: {}, started: false };
      tmSet(c2.secs, allTimeup);
    }
    if (t === "describe") {
      var c3 = H.cfg.describe;
      R = { type: "describe", c: c3, terms: drawT(c3.n), i: 0, clue: 0, phase: "clue", result: null };
      descTimer();
    }
    if (t === "explain") R = { type: "explain", c: H.cfg.explain, team: 0, phase: "ready", queue: [], cur: null, got: 0, skip: 0, foul: 0 };
    save(); H.view = "round"; paint();
  }

  /* ---------- rapid fire ---------- */
  function rapidNext() { if (!R.queue.length) R.queue = drawQ(8, R.c.show).map(wrapper(R.c.show)); R.cur = R.queue.shift(); R.rev = false; }
  function rapidStart() {
    R.phase = "run"; R.got = R.miss = R.skip = 0; R.queue = []; rapidNext();
    tmSet(R.c.secs, function () { R.phase = R.cur ? "timeup" : "done"; if (R.phase === "done") rapidFinish(); paint(); });
    tmStart(); paint();
  }
  function rapidFinish() {
    var pts = R.got * R.c.pts - R.miss * R.c.pen;
    H.teams[R.team].score += pts; R.pts = pts; R.phase = "done"; R.cur = null; tmClear(); save();
  }
  function rapidMark(res) {
    if (!R.cur || (R.phase !== "run" && R.phase !== "timeup")) return;
    if (res === "got") R.got++; else if (res === "miss") R.miss++; else { R.skip++; if (R.phase === "run") R.queue.push(R.cur); }
    if (R.phase === "timeup") { rapidFinish(); paint(); return; }
    rapidNext(); paint();
  }
  function rapidView() {
    var t = H.teams[R.team];
    if (R.phase === "ready") return shell('<p class="who">' + esc(t.name) + ', get ready</p><p class="sub">' + R.c.secs + ' seconds on the clock. Say the answer out loud, or say skip. ' + (R.c.show === 1 ? "Options are shown on screen." : R.c.show === 2 ? "Some questions have options, some do not." : "No options. Answer in your own words.") + '</p><div class="row tight"><button class="btn primary" data-act="rstart">Start the clock</button></div>', R.team);
    if (R.phase === "done") {
      var last = R.team >= H.teams.length - 1;
      return shell('<p class="who">' + esc(t.name) + ' finished</p><div class="tally">Got <b>' + R.got + '</b> · Missed <b>' + R.miss + '</b> · Skipped <b>' + R.skip + '</b></div><p class="qbig">+' + R.pts + ' points</p>' +
        '<div class="row tight">' + (last ? '<button class="btn primary" data-act="rend">Finish round</button>' : '<button class="btn primary" data-act="rnext">Next: ' + esc(H.teams[R.team + 1].name) + '</button>') + '</div>', R.team);
    }
    var inner = timerHTML() + '<div class="tally">Got <b>' + R.got + '</b> · Missed <b>' + R.miss + '</b> · Skipped <b>' + R.skip + '</b></div>' +
      (R.phase === "timeup" ? '<p class="who" style="color:var(--bad)">Time. Mark the last question.</p>' : "") +
      qBlock(R.cur, 0, R.rev) + marks([["got", "Got it (G)", "good"], ["miss", "Missed (M)", "bad"], ["skip", "Skip (S)", ""]]) + utilRow(R.rev, R.phase === "run");
    return shell(inner, R.team);
  }

  /* ---------- question board ---------- */
  function boardTimeup() { R.timeup = true; paint(); }
  function boardView() {
    var n = H.teams.length, t = H.teams[R.team];
    if (R.phase === "pick") {
      return shell('<p class="who">' + esc(t.name) + ', choose a tile</p><p class="sub">' + R.tiles.filter(function (x) { return x.st === "open"; }).length + ' tiles left.</p><div class="tiles">' + R.tiles.map(function (x, i) {
        return '<button class="tile ' + (x.st === "got" ? "got" : x.st === "miss" ? "miss" : "") + '" data-act="tile" data-i="' + i + '"' + (x.st !== "open" ? " disabled" : "") + '><b>' + (i + 1) + '</b><small>' + (x.st === "open" ? esc(subOf(x.w.q)) : x.st === "got" ? "Answered" : "Missed") + '</small></button>';
      }).join("") + '</div>', R.team);
    }
    var tile = R.tiles[R.ti], a = H.teams[R.ans];
    if (R.phase === "q") {
      var head = R.attempt ? '<p class="who">Steal: ' + esc(a.name) + ' for ' + Math.ceil(R.c.pts / 2) + ' points</p>' : '<p class="who">Tile ' + (R.ti + 1) + ' · ' + esc(a.name) + ' answers</p>';
      return shell(head + timerHTML() + (R.timeup ? '<p class="who" style="color:var(--bad)">Time.</p>' : "") + qBlock(tile.w, 0, R.rev) +
        marks([["got", "Correct (G)", "good"], ["miss", "Wrong (M)", "bad"]]) + utilRow(R.rev, !R.timeup), R.ans);
    }
    var l = R.last;
    var msg = l.res === "got" ? esc(H.teams[l.team].name) + ' +' + l.pts : "Nobody got it";
    var more = R.tiles.some(function (x) { return x.st === "open"; });
    return shell('<p class="who">' + msg + '</p>' + answerBox(tile.w) + '<div class="row tight"><button class="btn primary" data-act="bnext">' + (more ? "Next team: " + esc(H.teams[(R.team + 1) % n].name) : "Finish round") + '</button></div>', R.team);
  }
  function boardMark(res) {
    if (R.phase !== "q") return;
    var tile = R.tiles[R.ti], n = H.teams.length;
    if (res === "got") {
      var pts = R.attempt ? Math.ceil(R.c.pts / 2) : R.c.pts;
      H.teams[R.ans].score += pts; tile.st = "got"; R.last = { res: "got", team: R.ans, pts: pts }; R.phase = "result"; tmClear(); save();
    } else if (res === "miss") {
      if (R.c.steal && R.attempt === 0 && n > 1) {
        R.attempt = 1; R.ans = (R.team + 1) % n; R.timeup = false; R.rev = false;
        tmSet(R.c.secs, boardTimeup); tmStart();
      } else { tile.st = "miss"; R.last = { res: "miss" }; R.phase = "result"; tmClear(); }
    }
    paint();
  }

  /* ---------- everyone answers ---------- */
  function allTimeup() { R.phase = "mark"; R.rev = true; paint(); }
  function allView() {
    var w = R.qs[R.i], n = R.qs.length;
    var head = '<p class="sub">Question ' + (R.i + 1) + ' of ' + n + '</p>';
    if (R.phase === "q") {
      return shell(head + timerHTML() + qBlock(w, 0, false) +
        '<div class="row tight">' + (TM.running || R.started ? '<button class="btn small" data-act="pause">' + (TM.running ? "Pause" : "Resume") + ' <kbd>Space</kbd></button>' : '<button class="btn primary" data-act="astart">Start the clock <kbd>Space</kbd></button>') +
        '<button class="btn" data-act="areveal">Reveal and mark <kbd>R</kbd></button></div>', -1);
    }
    var chips = H.teams.map(function (t, i) {
      return '<button class="chip toggle" data-act="tog" data-i="' + i + '" aria-pressed="' + (!!R.right[i]) + '">' + esc(t.name) + '</button>';
    }).join("");
    return shell(head + qBlock(w, 0, true) + '<p class="label">Which teams got it right?</p><div class="teamchips">' + chips + '</div>' +
      '<div class="row tight"><button class="btn primary" data-act="aaward">' + (R.i === n - 1 ? "Award points and finish" : "Award points, next question") + '</button></div>', -1);
  }
  function allAward() {
    Object.keys(R.right).forEach(function (i) { if (R.right[i]) H.teams[i].score += R.c.pts; });
    save(); R.right = {};
    if (R.i >= R.qs.length - 1) { endRound(); return; }
    R.i++; R.phase = "q"; R.rev = false; R.started = false; tmSet(R.c.secs, allTimeup); paint();
  }

  /* ---------- describe it ---------- */
  function descTimer() {
    if (R.c.secs > 0) { tmSet(R.c.secs, function () { R.phase = "result"; R.result = { who: null }; paint(); }); tmStart(); } else tmClear();
  }
  function descView() {
    var term = R.terms[R.i], n = R.terms.length, len = term.clues.length, worth = len - R.clue;
    var head = '<p class="sub">Term ' + (R.i + 1) + ' of ' + n + ' · ' + esc(term.sub || "") + '</p>';
    if (R.phase === "clue" || R.phase === "who") {
      var shown = term.clues.slice(0, R.clue + 1).map(function (c, i) { return '<div class="clue"><span class="n">Clue ' + (i + 1) + '</span>' + esc(c) + '</div>'; }).join("");
      var body = head + (R.c.secs > 0 ? timerHTML() : "") + '<p class="who">Worth ' + worth + ' point' + (worth === 1 ? "" : "s") + ' if guessed now</p><div class="clues">' + shown + '</div>';
      if (R.phase === "who") {
        body += '<p class="label">Which team guessed it?</p><div class="teamchips">' + H.teams.map(function (t, i) { return '<button class="chip toggle" data-act="who" data-i="' + i + '">' + esc(t.name) + '</button>'; }).join("") + '</div><div class="row tight"><button class="btn ghost small" data-act="whoback">Back</button></div>';
      } else {
        body += '<div class="row tight">' + (R.clue < len - 1 ? '<button class="btn" data-act="clue">Next clue <kbd>N</kbd></button>' : "") +
          '<button class="btn good" data-act="mark" data-v="got">Someone guessed it <kbd>G</kbd></button><button class="btn bad" data-act="mark" data-v="miss">Nobody <kbd>M</kbd></button>' +
          (R.c.secs > 0 ? '<button class="btn small" data-act="pause">' + (TM.running ? "Pause" : "Resume") + '</button>' : "") + '</div>';
      }
      return shell(body, -1);
    }
    var r = R.result, msg = r.who === null ? "Nobody got it" : esc(H.teams[r.who].name) + " +" + r.pts;
    var last = R.i >= n - 1;
    return shell(head + '<p class="who">' + msg + '</p><p class="term-big">' + esc(term.term) + '</p><div class="row tight"><button class="btn primary" data-act="dnext">' + (last ? "Finish round" : "Next term") + '</button></div>', -1);
  }
  function descAward(i) {
    var term = R.terms[R.i], pts = term.clues.length - R.clue;
    H.teams[i].score += pts; R.result = { who: i, pts: pts }; R.phase = "result"; tmClear(); save(); paint();
  }

  /* ---------- explain it ---------- */
  function explainNext() { if (!R.queue.length) R.queue = drawT(8); R.cur = R.queue.shift(); }
  function explainStart() {
    R.phase = "run"; R.got = R.skip = R.foul = 0; R.queue = []; explainNext();
    tmSet(R.c.secs, function () { explainFinish(); paint(); });
    tmStart(); paint();
  }
  function explainFinish() {
    var pts = R.got * R.c.pts - R.foul * R.c.foul;
    H.teams[R.team].score += pts; R.pts = pts; R.phase = "done"; R.cur = null; tmClear(); save();
  }
  function explainMark(res) {
    if (R.phase !== "run" || !R.cur) return;
    if (res === "got") R.got++; else if (res === "foul") R.foul++; else R.skip++;
    explainNext(); paint();
  }
  function explainView() {
    var t = H.teams[R.team];
    if (R.phase === "ready") return shell('<p class="who">' + esc(t.name) + ', pick your explainer</p><p class="sub">' + R.c.secs + ' seconds. The explainer describes the term to teammates without saying the term or any listed word.</p><div class="row tight"><button class="btn primary" data-act="estart">Start the clock</button></div>', R.team);
    if (R.phase === "done") {
      var last = R.team >= H.teams.length - 1;
      return shell('<p class="who">' + esc(t.name) + ' finished</p><div class="tally">Got <b>' + R.got + '</b> · Skipped <b>' + R.skip + '</b> · Fouls <b>' + R.foul + '</b></div><p class="qbig">' + (R.pts >= 0 ? "+" : "") + R.pts + ' points</p>' +
        '<div class="row tight">' + (last ? '<button class="btn primary" data-act="rend">Finish round</button>' : '<button class="btn primary" data-act="rnext">Next: ' + esc(H.teams[R.team + 1].name) + '</button>') + '</div>', R.team);
    }
    var forb = (R.cur.forbidden || []).map(function (f) { return '<span class="chip">' + esc(f) + '</span>'; }).join("");
    return shell(timerHTML() + '<div class="tally">Got <b>' + R.got + '</b> · Skipped <b>' + R.skip + '</b> · Fouls <b>' + R.foul + '</b></div>' +
      '<p class="term-big">' + esc(R.cur.term) + '</p><p class="sub" style="text-align:center">Do not say:</p><div class="forbid">' + forb + '</div>' +
      marks([["got", "Got it (G)", "good"], ["skip", "Skip (S)", ""], ["foul", "Foul (F)", "bad"]]) + utilRow(null, true), R.team);
  }

  /* ---------- end of round and session ---------- */
  function endRound() { tmClear(); H.view = "roundend"; save(); paint(); }
  function roundEndView() {
    return '<div class="wrap wide stack"><header><p class="eyebrow">Round complete</p><h1>Scores so far</h1></header>' + scoreboard(-1, H.edit) +
      '<div class="row tight"><button class="btn primary" data-act="menu">Choose the next round</button><button class="btn" data-act="edit">' + (H.edit ? "Done adjusting scores" : "Adjust scores") + '</button><button class="btn ghost" data-act="final">End session</button></div></div>';
  }
  function finalView() {
    var order = H.teams.map(function (t, i) { return { t: t, i: i }; }).sort(function (a, b) { return b.t.score - a.t.score; });
    var pos = 0, prev = null;
    var rows = order.map(function (x, k) {
      if (x.t.score !== prev) { pos = k + 1; prev = x.t.score; }
      return '<div class="r' + (pos === 1 ? " first" : "") + '"><span class="pos">' + pos + '</span><span class="nm">' + esc(x.t.name) + (x.t.cls ? ' <span class="muted">· ' + esc(clsLabel(x.t.cls)) + '</span>' : "") + '</span><span class="pt">' + x.t.score + '</span></div>';
    }).join("");
    return '<div class="wrap stack"><header><p class="eyebrow">Final standings</p><h1>Session results</h1></header><div class="rank">' + rows + '</div>' +
      '<div class="row tight"><button class="btn" data-act="menu">Back to rounds</button><button class="btn ghost" data-act="reset">Reset scores</button><button class="btn ghost" data-act="setup">New session</button></div></div>';
  }

  /* ---------- view dispatch ---------- */
  function view() {
    if (H.view === "setup") return setupView();
    if (H.view === "menu") return menuView();
    if (H.view === "roundend") return roundEndView();
    if (H.view === "final") return finalView();
    if (R.type === "rapid") return rapidView();
    if (R.type === "board") return boardView();
    if (R.type === "all") return allView();
    if (R.type === "describe") return descView();
    return explainView();
  }

  /* ---------- actions ---------- */
  function doMark(v) {
    if (H.view !== "round" || !R) return;
    if (R.type === "rapid") rapidMark(v);
    else if (R.type === "board") boardMark(v);
    else if (R.type === "explain") explainMark(v);
    else if (R.type === "describe" && R.phase === "clue") {
      if (v === "got") { R.phase = "who"; tmStop(); paint(); }
      else if (v === "miss") { R.phase = "result"; R.result = { who: null }; tmClear(); paint(); }
    }
  }
  function doReveal() {
    if (H.view !== "round" || !R) return;
    if (R.type === "all" && R.phase === "q") { tmStop(); R.phase = "mark"; R.rev = true; paint(); return; }
    if (R.rev !== undefined) { R.rev = !R.rev; paint(); }
  }
  function doPause() {
    if (H.view !== "round" || !R) return;
    if (R.type === "all" && R.phase === "q" && !TM.running && !R.started) { R.started = true; tmStart(); paint(); return; }
    if (R.type === "all" && R.phase === "q") { R.started = true; tmPause(); return; }
    tmPause();
  }

  function onClick(e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act"), i = parseInt(b.getAttribute("data-i"), 10);
    switch (a) {
      case "addteam": H.teams.push({ name: "Team " + (H.teams.length + 1), cls: "", score: 0 }); save(); paint(); break;
      case "rmteam": if (H.teams.length > 2) { H.teams.pop(); save(); paint(); } break;
      case "begin": H.teams.forEach(function (t) { t.score = 0; }); H.used = {}; H.note = ""; H.view = "menu"; save(); paint(); break;
      case "setup": tmClear(); H.view = "setup"; paint(); break;
      case "menu": tmClear(); H.note = ""; H.view = "menu"; paint(); break;
      case "choose": H.pick = b.getAttribute("data-r"); paint(); break;
      case "launch": launch(); break;
      case "edit": H.edit = !H.edit; paint(); break;
      case "adj": H.teams[i].score += parseInt(b.getAttribute("data-d"), 10); save(); paint(); break;
      case "final": tmClear(); H.view = "final"; paint(); break;
      case "reset": H.teams.forEach(function (t) { t.score = 0; }); H.used = {}; save(); H.view = "menu"; paint(); break;
      case "mark": doMark(b.getAttribute("data-v")); break;
      case "reveal": doReveal(); break;
      case "pause": doPause(); break;
      case "rstart": rapidStart(); break;
      case "estart": explainStart(); break;
      case "rnext": R.team++; R.phase = "ready"; paint(); break;
      case "rend": endRound(); break;
      case "tile":
        R.ti = i; R.ans = R.team; R.attempt = 0; R.phase = "q"; R.rev = false; R.timeup = false;
        tmSet(R.c.secs, boardTimeup); tmStart(); paint(); break;
      case "bnext":
        if (R.tiles.some(function (x) { return x.st === "open"; })) { R.team = (R.team + 1) % H.teams.length; R.phase = "pick"; paint(); } else endRound();
        break;
      case "astart": R.started = true; tmStart(); paint(); break;
      case "areveal": doReveal(); break;
      case "tog": R.right[i] = !R.right[i]; paint(); break;
      case "aaward": allAward(); break;
      case "clue": if (R.clue < R.terms[R.i].clues.length - 1) { R.clue++; paint(); } break;
      case "who": descAward(i); break;
      case "whoback": R.phase = "clue"; if (R.c.secs > 0) tmStart(); paint(); break;
      case "dnext":
        if (R.i >= R.terms.length - 1) endRound(); else { R.i++; R.clue = 0; R.phase = "clue"; R.result = null; descTimer(); paint(); }
        break;
    }
  }

  function onInput(e) {
    var el = e.target;
    if (el.hasAttribute("data-clsname")) {
      var cid = el.getAttribute("data-clsname"), nm = el.value.trim();
      DX.curriculum.classes.forEach(function (k) { if (k.id === cid) k.name = nm; });
      var all = {}; DX.curriculum.classes.forEach(function (k) { all[k.id] = k.name; });
      DX.store.set("dx.classnames", all);
    } else if (el.hasAttribute("data-team")) {
      var t = H.teams[parseInt(el.getAttribute("data-team"), 10)];
      t[el.getAttribute("data-f")] = el.value; save();
    } else if (el.getAttribute("data-f") === "scope") {
      H.scope = el.value;
      var hint = document.getElementById("scopehint"); if (hint) hint.textContent = scopeHint();
    } else if (el.hasAttribute("data-cfg")) {
      var type = el.getAttribute("data-cfg"), k = el.getAttribute("data-k");
      if (el.type === "checkbox") H.cfg[type][k] = el.checked ? 1 : 0;
      else if (el.hasAttribute("data-fmt")) { H.cfg[type][k] = parseInt(el.value, 10); }
      else {
        var f = META[type].fields.filter(function (x) { return x[0] === k; })[0];
        var v = parseInt(el.value, 10);
        if (isNaN(v)) return;
        H.cfg[type][k] = Math.max(f[3], Math.min(f[4], v));
      }
      save();
    }
  }

  function onKey(e) {
    if (H.view !== "round" || !R) return;
    var k = e.key.toLowerCase();
    if (k === "g") { if (R.type === "describe" || R.type === "board" || R.type === "rapid" || R.type === "explain") { doMark("got"); } }
    else if (k === "m") doMark("miss");
    else if (k === "s") { if (R.type === "rapid" || R.type === "explain") doMark("skip"); }
    else if (k === "f") { if (R.type === "explain") doMark("foul"); }
    else if (k === "r") doReveal();
    else if (k === "n") { if (R.type === "describe" && R.phase === "clue" && R.clue < R.terms[R.i].clues.length - 1) { R.clue++; paint(); } }
    else if (e.key === " ") { e.preventDefault(); doPause(); }
  }

  function render(el) {
    app = el; init();
    app.innerHTML = view(); tmPaint();
  }
  function leave() { tmStop(); }

  DX.hall = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave };
})();
