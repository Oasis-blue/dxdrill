/* Flashcards: recall first, then check. Cards you miss come back sooner; cards you know come back later (five boxes). Saved on this device only. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var DAYS = [1, 2, 4, 8, 16, 32];                     /* how many days until a card in box 1..6 is due again */
  var CFG = DX.store.get("dx.cards.cfg", {});
  var F = { view: "setup", scope: CFG.scope || "", kind: CFG.kind || "both", size: CFG.size || 20, q: [], i: 0, shown: false, clue: 1, got: 0, missed: [], total: 0, again: {} };
  DX.cards = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave };

  var css = document.createElement("style");
  css.textContent =
    ".fc{background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:20px;display:flex;flex-direction:column;gap:12px;min-width:0}" +
    ".fc .tag{font-size:13px;color:var(--muted)}.fc .big{font-family:var(--font-display);font-size:clamp(22px,5vw,30px);font-weight:700;overflow-wrap:anywhere}" +
    ".fc .clue{border-left:3px solid var(--accent);padding:2px 0 2px 12px;font-size:17px;overflow-wrap:anywhere}.fc .clue.dim{opacity:.7}" +
    ".fc .stem{font-size:19px;line-height:1.45;overflow-wrap:anywhere}" +
    ".fcrate{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
    ".fcrate .btn{min-height:52px}" +
    ".fcstats{display:flex;flex-wrap:wrap;gap:8px}.fcstats span{background:var(--surface2);border-radius:99px;padding:4px 12px;font-size:14px}" +
    ".fcf select{width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg)}";
  document.head.appendChild(css);

  /* ---------- the saved box of each card ---------- */
  function today() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
  function box() { return DX.store.get("dx.cards", {}); }
  function rate(id, got) {
    var b = box(), s = b[id] || { b: 0, d: 0 };
    if (got) { s.b = Math.min(6, s.b + 1); s.d = today() + DAYS[s.b - 1]; } else { s.b = 0; s.d = today(); }
    b[id] = s; DX.store.set("dx.cards", b);
  }

  /* ---------- the deck ---------- */
  function termCards() {
    return DX.terms.filter(function (t) { return t.clues && t.clues.length; }).map(function (t) {
      return { id: "t|" + t.topic + "|" + t.term, kind: "term", topic: t.topic, area: t.area, subject: t.subject, term: t.term, clues: t.clues, sub: t.sub };
    });
  }
  function questionCards() {
    return DX.questions.filter(function (q) { return q.options && typeof q.answer === "number" && q.options[q.answer] != null; }).map(function (q) {
      return { id: "q|" + q.id, kind: "q", topic: q.topic, area: q.area, subject: q.subject, q: q.q, img: DX.qImg(q), answerText: q.options[q.answer], explain: q.explain || "", sub: q.sub };
    });
  }
  function inScope(c) {
    var s = F.scope; if (!s) return true;
    var p = s.split(":"); return p[0] === "s" ? c.subject === p[1] : p[0] === "a" ? c.area === p[1] : c.topic === p[1];
  }
  function pool() {
    var cards = [];
    if (F.kind !== "q") cards = cards.concat(termCards());
    if (F.kind !== "t") cards = cards.concat(questionCards());
    return cards.filter(inScope);
  }
  function counts() {
    var b = box(), t = today(), all = pool(), due = 0, fresh = 0, known = 0;
    all.forEach(function (c) { var s = b[c.id]; if (!s) fresh++; else { if (s.d <= t) due++; if (s.b >= 4) known++; } });
    return { all: all.length, due: due, fresh: fresh, known: known };
  }
  function build() {
    var b = box(), t = today(), all = pool();
    var due = all.filter(function (c) { return b[c.id] && b[c.id].d <= t; }).sort(function (x, y) { return b[x.id].b - b[y.id].b; });
    var fresh = DX.shuffle(all.filter(function (c) { return !b[c.id]; }));
    var n = F.size === "all" ? 9999 : Number(F.size);
    return due.slice(0, n).concat(fresh.slice(0, Math.max(0, n - due.length)));
  }
  function save() { DX.store.set("dx.cards.cfg", { scope: F.scope, kind: F.kind, size: F.size }); }

  /* ---------- screens ---------- */
  function scopeOptions() {
    var out = '<option value="">Everything</option>';
    DX.curriculum.subjects.forEach(function (s) {
      out += '<optgroup label="' + esc(s.name) + '"><option value="s:' + esc(s.id) + '"' + (F.scope === "s:" + s.id ? " selected" : "") + '>All of ' + esc(s.name) + '</option>';
      s.areas.forEach(function (a) {
        a.topics.forEach(function (tp) {
          var has = tp.count || DX.terms.some(function (x) { return x.topic === tp.id; });
          if (has) out += '<option value="t:' + esc(tp.id) + '"' + (F.scope === "t:" + tp.id ? " selected" : "") + '>' + esc(tp.name) + '</option>';
        });
      });
      out += "</optgroup>";
    });
    return out;
  }
  function setupHtml() {
    var c = counts(), n = build().length;
    return '<header><p class="eyebrow">Flashcards</p><h1>Recall it first</h1><p class="lede">Try to remember the answer before you look. Cards you miss come back soon, and cards you know come back later. Your progress is saved on this device.</p></header>' +
      '<section class="fc fcf"><div class="field"><label class="label" for="fc-scope">What to study</label><select id="fc-scope">' + scopeOptions() + '</select></div>' +
      '<div class="field"><label class="label" for="fc-kind">Cards</label><select id="fc-kind"><option value="both"' + (F.kind === "both" ? " selected" : "") + '>Terms and questions</option><option value="t"' + (F.kind === "t" ? " selected" : "") + '>Terms only (clues)</option><option value="q"' + (F.kind === "q" ? " selected" : "") + '>Questions only</option></select></div>' +
      '<div class="field"><label class="label" for="fc-size">Cards this round</label><select id="fc-size">' + ["10", "20", "40", "all"].map(function (v) { return '<option value="' + v + '"' + (String(F.size) === v ? " selected" : "") + '>' + (v === "all" ? "All that are due and new" : v) + '</option>'; }).join("") + '</select></div>' +
      '<div class="fcstats"><span>' + c.all + ' cards</span><span>' + c.due + ' due</span><span>' + c.fresh + ' new</span><span>' + c.known + ' well known</span></div>' +
      (n ? '<div class="row tight"><button class="btn primary" data-act="start">Start (' + n + ' cards)</button></div>' : '<p class="muted">Nothing is due here right now. Come back tomorrow, or pick something wider.</p>') +
      '</section>';
  }
  function cardHtml() {
    var c = F.q[F.i], left = F.q.length - F.i, out = "";
    var head = '<div class="row tight" style="justify-content:space-between"><span class="tag">' + esc(c.sub || "") + (F.again[c.id] ? " · second try" : "") + '</span><span class="tag">' + left + ' left</span></div><div class="track"><i style="width:' + DX.pct(F.i, F.q.length) + '%"></i></div>';
    if (c.kind === "term") {
      var clues = c.clues.slice(0, F.shown ? c.clues.length : F.clue).map(function (t, k) { return '<p class="clue' + (F.shown ? "" : "") + '">' + esc(t) + '</p>'; }).join("");
      if (!F.shown) {
        out = head + '<p class="tag">What term is this? (clue ' + F.clue + ' of ' + c.clues.length + ')</p>' + clues +
          '<div class="row tight">' + (F.clue < c.clues.length ? '<button class="btn ghost" data-act="clue">Another clue <kbd>C</kbd></button>' : "") + '<button class="btn primary" data-act="show">Show answer <kbd>Space</kbd></button></div>';
      } else {
        out = head + '<p class="tag">The term</p><p class="big">' + esc(c.term) + '</p>' + clues + rateHtml();
      }
    } else {
      if (!F.shown) out = head + '<p class="tag">Question. Say the answer in your head first.</p>' + (c.img || "") + '<p class="stem">' + esc(c.q) + '</p><div class="row tight"><button class="btn primary" data-act="show">Show answer <kbd>Space</kbd></button></div>';
      else out = head + (c.img || "") + '<p class="stem">' + esc(c.q) + '</p><p class="tag">Answer</p><p class="big">' + esc(c.answerText) + '</p>' + (c.explain ? '<p>' + esc(c.explain) + '</p>' : "") + rateHtml();
    }
    return '<section class="fc" id="fc-card">' + out + '</section><div class="row tight"><button class="btn ghost small" data-act="stop">Stop session <kbd>Esc</kbd></button></div>';
  }
  function rateHtml() {
    return '<p class="tag">Did you remember it?</p><div class="fcrate"><button class="btn" data-act="miss">Not yet <kbd>1</kbd></button><button class="btn primary" data-act="got">Got it <kbd>2</kbd></button></div>';
  }
  function doneHtml() {
    return '<section class="fc"><p class="eyebrow">Round finished</p><h2>' + F.got + ' of ' + F.total + ' remembered</h2>' +
      (F.missed.length ? '<p>' + F.missed.length + ' to look at again. They will be due again today.</p>' : '<p>Every card was remembered. They come back in a day or more.</p>') +
      '<div class="row tight">' + (F.missed.length ? '<button class="btn primary" data-act="redo">Go over the ' + F.missed.length + ' missed</button>' : "") + '<button class="btn ' + (F.missed.length ? "ghost" : "primary") + '" data-act="home">Back to flashcards</button></div></section>';
  }

  function leave() { }
  function render(a) {
    app = a;
    if (!DX.questions.length && !DX.terms.length) { a.innerHTML = '<div class="wrap stack"><h1>Flashcards</h1><p class="lede">Loading the cards…</p></div>'; return; }
    var body = F.view === "setup" ? setupHtml() : F.view === "done" ? doneHtml() : cardHtml();
    a.innerHTML = '<div class="wrap stack">' + body + '</div>';
  }
  function repaint() { if ((location.hash || "") === "#cards" && app) render(app); }
  function begin(list) {
    F.q = list; F.i = 0; F.shown = false; F.clue = 1; F.got = 0; F.missed = []; F.total = list.length; F.again = {}; F.view = list.length ? "run" : "setup"; repaint();
  }
  function reveal() {
    if (F.view !== "run" || F.shown) return;
    F.shown = true; repaint();
    if (DX.fx) DX.fx.add(document.getElementById("fc-card"), "fx-flipin");
  }
  function answer(got) {
    if (F.view !== "run" || !F.shown) return;
    var c = F.q[F.i];
    if (!F.again[c.id]) { rate(c.id, got); if (got) F.got++; else F.missed.push(c); }   /* the first answer to a card is what counts */
    if (!got) { F.again[c.id] = 1; F.q.splice(Math.min(F.q.length, F.i + 4), 0, c); }   /* a missed card comes back a few cards later */
    if (DX.fx) { DX.fx.play(got ? "ok" : "bad"); }
    F.i++; F.shown = false; F.clue = 1;
    if (F.i >= F.q.length) F.view = "done";
    repaint();
    if (DX.fx && F.view === "run") DX.fx.add(document.getElementById("fc-card"), "fx-rise");
  }
  function stopSession() {
    if (F.view !== "run") return;
    var seen = F.got + F.missed.length;
    if (!seen) { F.view = "setup"; repaint(); return; }
    F.total = seen; F.view = "done"; repaint();
  }
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === "fc-scope") F.scope = e.target.value;
    else if (id === "fc-kind") F.kind = e.target.value;
    else if (id === "fc-size") F.size = e.target.value;
    else return;
    save(); repaint();
  }
  function onKey(e) {
    if (F.view !== "run" || (e.target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) && e.key === " ")) return;
    var k = e.key;
    if (k === "Escape") { stopSession(); return; }
    if (!F.shown) {
      if (k === " " || k === "Enter") { e.preventDefault(); reveal(); }
      else if ((k === "c" || k === "C") && F.q[F.i].kind === "term" && F.clue < F.q[F.i].clues.length) { F.clue++; repaint(); }
    } else if (k === "1" || k === "ArrowLeft") answer(false);
    else if (k === "2" || k === "ArrowRight" || k === "Enter") answer(true);
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null; if (!t) return;
    if (DX.fx && DX.fx.unlock) DX.fx.unlock();
    var a = t.getAttribute("data-act");
    if (a === "start") begin(build());
    else if (a === "show") reveal();
    else if (a === "clue") { F.clue++; repaint(); }
    else if (a === "got") answer(true);
    else if (a === "miss") answer(false);
    else if (a === "redo") { var m = F.missed.slice(); F.again = {}; F.missed = []; F.got = 0; begin(DX.shuffle(m)); F.total = m.length; }
    else if (a === "stop") stopSession();
    else if (a === "home") { F.view = "setup"; repaint(); }
  }
})();
