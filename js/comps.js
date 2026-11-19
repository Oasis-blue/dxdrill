/* Window competitions: ranked, timed, marked on the server. Questions come from a hidden bank that students cannot read. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var K = { loaded: false, loading: false, comps: [], mine: {}, bank: [], view: "list", cur: null, st: null, res: null, review: null,
            err: "", msg: "", busy: false, form: {}, confirm: null, timer: null, deadline: 0, sent: false };
  DX.comps = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave };

  var css = document.createElement("style");
  css.textContent =
    ".cmp{background:var(--surface);border:1.5px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}" +
    ".cmp h3{font-size:18px;overflow-wrap:anywhere}.cmp .tag{font-size:13px;color:var(--muted)}" +
    ".copt{display:block;width:100%;text-align:left;border:1.5px solid var(--line);background:var(--bg);border-radius:10px;padding:12px;min-height:48px;overflow-wrap:anywhere}" +
    ".copt:disabled{opacity:.6}.copt b{display:inline-block;min-width:22px;color:var(--muted)}" +
    ".copt.right{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--bg))}.copt.mine:not(.right){border-style:dashed}" +
    ".cbar{height:8px;border-radius:99px;background:var(--surface2);overflow:hidden}.cbar i{display:block;height:100%;background:var(--accent);transition:width .25s linear}" +
    ".cbar.low i{background:#c0392b}.ctime{font-family:var(--font-display);font-weight:700;font-variant-numeric:tabular-nums}" +
    ".cform input[type=text],.cform input[type=number],.cform input[type=datetime-local],.cform select,.cform textarea{width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg)}" +
    ".cform textarea{min-height:110px;resize:vertical;font-family:ui-monospace,Menlo,monospace;font-size:13px}" +
    ".ctable{width:100%;border-collapse:collapse;font-size:14px}.ctable th,.ctable td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}.ctable td.n,.ctable th.n{text-align:right;font-variant-numeric:tabular-nums}" +
    ".cscroll{overflow-x:auto}";
  document.head.appendChild(css);

  function C() { return DX.cloud; }
  function admin() { return !!(C().profile && C().profile.is_admin); }
  function when(s) { try { return new Date(s).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return String(s); } }
  function clsLabel(id) { var c = DX.curriculum.classes.filter(function (x) { return x.id === id; })[0]; return c ? c.label : (id || ""); }
  function mmss(ms) { var s = Math.round(Number(ms) / 1000), m = Math.floor(s / 60); return m + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function status(c) { var n = Date.now(); return n < new Date(c.opens_at).getTime() ? "soon" : n > new Date(c.closes_at).getTime() ? "closed" : "open"; }
  function fail(e, fb) {
    var m = (e && e.message) || "";
    if (C().isDown(e)) return "DxDrill’s online part is not answering. It may be waking up, so try again in a minute.";
    if (/not open yet/i.test(m)) return "This competition has not opened yet.";
    if (/too late to start/i.test(m)) return "It is too late to start. A full attempt needs to finish before the competition closes.";
    if (/not enough questions/i.test(m)) return "The hidden bank does not have enough questions for that. " + (/have (\d+)/.test(m) ? "It has " + m.match(/have (\d+)/)[1] + "." : "");
    if (/results not open/i.test(m)) return "Results open when the competition closes.";
    if (/4 options/i.test(m)) return m.replace(/^.*question/i, "Question");
    if (/schema cache|does not exist|comp_state|competitions/i.test(m)) return "Competitions are not switched on yet. Run supabase/update-4.sql in Supabase.";
    if (/not allowed/i.test(m)) return "Only the admin can do that.";
    return fb;
  }
  function stopTimer() { if (K.timer) { clearInterval(K.timer); K.timer = null; } }
  function leave() { stopTimer(); K.loaded = false; K.loading = false; K.confirm = null; if (K.view === "play") K.view = "list"; }
  function repaint() { if ((location.hash || "") === "#competitions" && app) render(app); }

  function load() {
    var sb = C().sb;
    Promise.all([
      sb.from("competitions").select("id,name,opens_at,closes_at,n_questions,seconds_per_q,pool").order("opens_at", { ascending: false }).limit(20),
      sb.from("competition_entries").select("competition_id,finished_at").eq("user_id", C().user.id),
      admin() ? sb.rpc("admin_comp_bank") : Promise.resolve({ data: [] })
    ]).then(function (r) {
      if (r[0].error) throw r[0].error;
      if (r[1].error) throw r[1].error;
      K.comps = r[0].data || []; K.mine = {};
      (r[1].data || []).forEach(function (x) { K.mine[x.competition_id] = { finished: !!x.finished_at }; });
      K.bank = (r[2] && r[2].data) || [];
      K.loaded = true; K.loading = false; K.err = ""; repaint();
    }).catch(function (e) { K.err = fail(e, "Could not load the competitions."); K.down = C().isDown(e); K.loaded = true; K.loading = false; repaint(); });
  }
  function act(p, ok) {
    K.busy = true; K.err = ""; K.msg = ""; repaint();
    return p.then(function (r) { if (r && r.error) throw r.error; return ok ? ok(r) : null; })
      .then(function () { K.busy = false; repaint(); })
      .catch(function (e) { K.busy = false; K.err = fail(e, "That did not work. Try again."); repaint(); });
  }

  /* ---------- playing ---------- */
  function setState(r) {
    var row = (r.data && r.data[0]) || null; K.st = row; K.sent = false; stopTimer();
    if (row && row.state === "question") {
      K.deadline = performance.now() + Number(row.secs_left) * 1000;
      K.timer = setInterval(tick, 200);
    }
    if (row && row.state === "finished" && K.cur) K.mine[K.cur.id] = { finished: true };
  }
  function tick() {
    var left = Math.max(0, K.deadline - performance.now()), per = K.cur ? K.cur.seconds_per_q * 1000 : 30000;
    var t = document.getElementById("cd-t"), bar = document.getElementById("cd-b");
    if (t) t.textContent = Math.ceil(left / 1000) + "s";
    if (bar) { bar.firstChild.style.width = Math.min(100, left * 100 / per) + "%"; bar.className = "cbar" + (left < 6000 ? " low" : ""); }
    if (left <= 0 && !K.sent && K.st && K.st.state === "question") { K.sent = true; send(-1); }
  }
  function send(choice) {
    if (!K.st || K.st.state !== "question" || K.busy) return;
    K.sent = true; stopTimer(); K.busy = true; K.err = "";
    C().sb.rpc("comp_answer", { p_comp: K.cur.id, p_idx: K.st.q_idx, p_choice: choice }).then(function (r) {
      if (r.error) throw r.error; K.busy = false; setState(r); repaint();
    }).catch(function (e) { K.busy = false; K.err = fail(e, "Could not send your answer."); K.retry = true; repaint(); });
  }
  function begin(c) {
    K.cur = c; K.view = "play"; K.st = null;
    act(C().sb.rpc("comp_start", { p_comp: c.id }), function (r) { setState(r); if (K.st && K.st.state === "question") K.mine[c.id] = { finished: false }; })
      .then(function () { if (K.err) K.view = "list"; repaint(); });
  }

  function playHtml() {
    var s = K.st, c = K.cur;
    if (!s) return '<p class="muted">Starting…</p>';
    if (s.state === "finished") return '<section class="cmp"><h3>You have finished</h3><p>Your answers are saved. Results open when the competition closes on ' + esc(when(c.closes_at)) + '.</p><div class="row tight"><button class="btn" data-act="back">Back to competitions</button></div></section>';
    if (s.state !== "question") return '<p class="muted">Loading…</p>';
    var letters = ["A", "B", "C", "D"];
    return '<section class="cmp"><div class="row tight" style="justify-content:space-between"><span class="tag">Question ' + (Number(s.q_idx) + 1) + ' of ' + s.q_total + '</span><span class="ctime" id="cd-t" aria-live="off"></span></div>' +
      '<div class="cbar" id="cd-b"><i style="width:100%"></i></div><h3>' + esc(s.q_text) + '</h3>' +
      s.q_options.map(function (o, i) { return '<button class="copt" data-act="pick" data-i="' + i + '"' + (K.busy ? " disabled" : "") + '><b>' + letters[i] + '</b> ' + esc(o) + '</button>'; }).join("") +
      '<p class="tag">Answers are not shown until the competition closes. Your time per question counts as a tiebreaker.</p></section>';
  }

  /* ---------- results ---------- */
  function openResults(c) {
    K.cur = c; K.view = "results"; K.res = null; K.review = null; K.err = ""; var sb = C().sb;
    K.busy = true; repaint();
    Promise.all([sb.rpc("comp_my_result", { p_comp: c.id }), sb.rpc("comp_leaderboard", { p_comp: c.id }), sb.rpc("comp_class_board", { p_comp: c.id })]).then(function (r) {
      var er = r[0].error || r[1].error || r[2].error; if (er) throw er;
      K.res = { me: (r[0].data || [])[0] || null, lb: r[1].data || [], cls: r[2].data || [] }; K.busy = false; repaint();
    }).catch(function (e) { K.busy = false; K.err = fail(e, "Could not load the results."); K.view = "list"; repaint(); });
  }
  function resultsHtml() {
    var c = K.cur, R = K.res;
    var head = '<div class="row tight"><button class="btn ghost small" data-act="back">Back</button></div><header><p class="eyebrow">Results</p><h1>' + esc(c.name) + '</h1></header>';
    if (!R) return head + '<p class="muted">Loading…</p>';
    var me = R.me ? '<section class="cmp"><h3>Your result: ' + R.me.score + ' of ' + R.me.q_total + '</h3><p class="tag">Rank ' + R.me.my_rank + ' of ' + R.me.participants + ' · time ' + mmss(R.me.total_ms) + '</p></section>' : '<p class="muted">You did not take part in this one.</p>';
    var lb = R.lb.length ? '<section class="section stack"><h2>Top scores</h2><div class="cscroll"><table class="ctable"><thead><tr><th class="n">#</th><th>Name</th><th>Class</th><th class="n">Score</th><th class="n">Time</th></tr></thead><tbody>' +
      R.lb.slice(0, 50).map(function (x, i) { return '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(x.display_name) + '</td><td>' + esc(clsLabel(x.class_id)) + '</td><td class="n">' + x.score + '/' + x.q_total + '</td><td class="n">' + mmss(x.total_ms) + '</td></tr>'; }).join("") +
      '</tbody></table></div></section>' : '<p class="muted">Nobody took part.</p>';
    var cl = R.cls.length ? '<section class="section stack"><h2>Classes</h2><p class="hint">Average score per student who took part.</p><div class="cscroll"><table class="ctable"><thead><tr><th>Class</th><th class="n">Students</th><th class="n">Average</th></tr></thead><tbody>' +
      R.cls.map(function (x) { return '<tr><td>' + esc(clsLabel(x.class_id)) + '</td><td class="n">' + x.participants + '</td><td class="n">' + Number(x.avg_score).toFixed(1) + '</td></tr>'; }).join("") + '</tbody></table></div></section>' : "";
    var rv = "";
    if (R.me) {
      if (!K.review) rv = '<div class="row tight"><button class="btn" data-act="review"' + (K.busy ? " disabled" : "") + '>Review my answers</button></div>';
      else rv = '<section class="section stack"><h2>Your answers</h2>' + K.review.map(function (x) {
        var L = ["A", "B", "C", "D"];
        return '<div class="cmp"><span class="tag">Question ' + (x.idx + 1) + ' · ' + (x.was_correct ? "correct" : x.your_choice < 0 ? "out of time" : "wrong") + '</span><p>' + esc(x.q_text) + '</p>' +
          x.q_options.map(function (o, i) { return '<div class="copt' + (i === x.right_answer ? " right" : "") + (i === x.your_choice ? " mine" : "") + '"><b>' + L[i] + '</b> ' + esc(o) + (i === x.your_choice ? " (your answer)" : "") + '</div>'; }).join("") +
          (x.explain ? '<p class="why">' + esc(x.explain) + '</p>' : "") + '</div>'; }).join("") + '</section>';
    }
    return head + me + lb + cl + rv;
  }

  /* ---------- list + admin ---------- */
  function cardHtml(c) {
    var st = status(c), mine = K.mine[c.id], btn = "", line;
    if (st === "soon") line = "Opens " + when(c.opens_at);
    else if (st === "open") line = "Open until " + when(c.closes_at);
    else line = "Closed " + when(c.closes_at);
    if (st === "open") btn = mine ? (mine.finished ? '<span class="tag">Finished. Results open when it closes.</span>' : '<button class="btn primary" data-act="start" data-id="' + c.id + '"' + (K.busy ? " disabled" : "") + '>Resume</button>') : '<button class="btn primary" data-act="start" data-id="' + c.id + '"' + (K.busy ? " disabled" : "") + '>Start</button>';
    if (st === "closed" || admin()) btn += (btn ? " " : "") + '<button class="btn' + (st === "closed" ? " primary" : " ghost small") + '" data-act="results" data-id="' + c.id + '">' + (st === "closed" ? "Results" : "Results (admin)") + '</button>';
    var adm = !admin() ? "" : '<div class="row tight">' + (st !== "closed" ? '<button class="btn ghost small" data-act="cend" data-id="' + c.id + '">End now</button>' : "") +
      '<button class="btn ghost small" data-act="cdel" data-id="' + c.id + '">Delete</button></div>' +
      (K.confirm === c.id ? '<p class="note bad">Delete this competition and every result? This cannot be undone.</p><div class="row tight"><button class="btn small primary" data-act="cdelyes" data-id="' + c.id + '">Yes, delete</button><button class="btn ghost small" data-act="cno">Cancel</button></div>' : "");
    return '<article class="cmp"><p class="tag">' + esc(line) + '</p><h3>' + esc(c.name) + '</h3><p class="tag">' + c.n_questions + ' questions · ' + c.seconds_per_q + ' seconds each · one attempt</p><div class="row tight">' + btn + '</div>' + adm + '</article>';
  }
  function fv(id, d) { return K.form[id] !== undefined ? K.form[id] : d; }
  function localDT(ms) { var d = new Date(ms - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
  function adminHtml() {
    var pools = K.bank.map(function (b) { return '<option value="' + esc(b.pool) + '"' + (fv("cf-pool", "") === b.pool ? " selected" : "") + '>' + esc(b.pool) + ' (' + b.questions + ')</option>'; }).join("");
    var total = K.bank.reduce(function (s, b) { return s + Number(b.questions); }, 0);
    var bank = '<section class="section stack cform"><h2>Admin: hidden question bank</h2><p class="hint">Paste questions here, never on GitHub. Anything on GitHub is public. Use the same JSON the checker produces (the questions list). Only questions with exactly 4 options are used.</p>' +
      (K.bank.length ? '<p class="hint">In the bank: ' + K.bank.map(function (b) { return esc(b.pool) + " " + b.questions; }).join(" · ") + ' (' + total + ' total)</p>' : '<p class="hint">The bank is empty.</p>') +
      '<div class="field"><label class="label" for="ci-pool">Pool name</label><input type="text" id="ci-pool" maxlength="40" value="' + esc(fv("ci-pool", "general")) + '"></div>' +
      '<div class="field"><label class="label" for="ci-text">Questions (JSON)</label><textarea id="ci-text" spellcheck="false">' + esc(fv("ci-text", "")) + '</textarea></div>' +
      '<div class="row tight"><button class="btn small primary" data-act="import"' + (K.busy ? " disabled" : "") + '>Import</button>' +
      K.bank.map(function (b) { return '<button class="btn ghost small" data-act="pooldel" data-pool="' + esc(b.pool) + '">Delete pool ' + esc(b.pool) + '</button>'; }).join("") + '</div>' +
      (K.poolConfirm ? '<p class="note bad">Delete every question in the pool “' + esc(K.poolConfirm) + '”? Competitions already run keep their results, but their questions will be gone from the review.</p><div class="row tight"><button class="btn small primary" data-act="pooldelyes">Yes, delete</button><button class="btn ghost small" data-act="cno">Cancel</button></div>' : "") + '</section>';
    var now = Date.now();
    var create = '<section class="section stack cform"><h2>Admin: new competition</h2>' +
      '<div class="field"><label class="label" for="cf-name">Name</label><input type="text" id="cf-name" maxlength="80" value="' + esc(fv("cf-name", "")) + '"></div>' +
      '<div class="teamrow"><div class="field"><label class="label" for="cf-open">Opens</label><input type="datetime-local" id="cf-open" value="' + esc(fv("cf-open", localDT(now))) + '"></div>' +
      '<div class="field"><label class="label" for="cf-close">Closes</label><input type="datetime-local" id="cf-close" value="' + esc(fv("cf-close", localDT(now + 2 * 86400000))) + '"></div></div>' +
      '<div class="teamrow"><div class="field"><label class="label" for="cf-n">Questions</label><input type="number" id="cf-n" min="1" max="100" value="' + esc(fv("cf-n", "10")) + '"></div>' +
      '<div class="field"><label class="label" for="cf-sec">Seconds each</label><input type="number" id="cf-sec" min="5" max="300" value="' + esc(fv("cf-sec", "30")) + '"></div></div>' +
      '<div class="field"><label class="label" for="cf-pool">Draw from</label><select id="cf-pool"><option value="">Whole bank</option>' + pools + '</select></div>' +
      '<p class="hint">Students must start early enough to finish before it closes. Answers and scores stay hidden until then.</p>' +
      '<div class="row tight"><button class="btn small primary" data-act="create"' + (K.busy ? " disabled" : "") + '>Create competition</button></div></section>';
    return bank + create;
  }

  function render(a) {
    app = a; var c = C();
    if (!c || !c.ok) { a.innerHTML = '<div class="wrap stack"><h1>Compete</h1><p class="lede">Competitions could not load. Check your connection and refresh.</p></div>'; return; }
    if (!c.user) { a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Compete</p><h1>Sign in to compete</h1><p class="lede">Ranked, timed rounds for the whole school.</p></header><a class="btn primary" href="#account" style="text-decoration:none;align-self:flex-start">Sign in or create an account</a></div>'; return; }
    var body = "";
    if (!K.loaded && K.view === "list") { body = '<p class="muted">Loading…</p>'; if (!K.loading) { K.loading = true; load(); } }
    var note = (K.err ? '<p class="note bad" role="alert">' + esc(K.err) + '</p>' + (K.retry ? '<div class="row tight"><button class="btn small" data-act="resume">Try again</button></div>' : K.down ? '<div class="row tight"><button class="btn small" data-act="back">Try again</button></div>' : "") : "") + (K.msg ? '<p class="note">' + esc(K.msg) + '</p>' : "");
    if (K.view === "play") body = playHtml();
    else if (K.view === "results") body = resultsHtml();
    else if (K.loaded) body = (K.comps.length ? K.comps.map(cardHtml).join("") : '<p class="muted">No competitions yet.</p>') + (admin() ? adminHtml() : "");
    var head = K.view === "list" ? '<header><p class="eyebrow">Compete</p><h1>Competitions</h1><p class="lede">Ranked and timed. Every student gets different questions from a hidden bank, and answers stay secret until it closes.</p></header>' : "";
    a.innerHTML = '<div class="wrap stack">' + head + note + body + '</div>';
    ["ci-pool", "ci-text", "cf-name", "cf-open", "cf-close", "cf-n", "cf-sec", "cf-pool"].forEach(function (id) { var el = document.getElementById(id); if (el && K.form[id] !== undefined) el.value = K.form[id]; });
    if (K.view === "play" && K.st && K.st.state === "question") tick();
  }

  function onInput(e) { var id = e.target && e.target.id; if (id && /^c[if]-/.test(id)) K.form[id] = e.target.value; }
  function onKey(e) {
    if (K.view !== "play" || !K.st || K.st.state !== "question") return;
    var i = "abcd".indexOf(e.key.toLowerCase()); if (i < 0) i = ["1", "2", "3", "4"].indexOf(e.key);
    if (i >= 0) send(i);
  }
  function parseItems(text) {
    var d = JSON.parse(text), arr = Array.isArray(d) ? d : (d && d.questions) || [], out = [], skipped = 0;
    arr.forEach(function (x) {
      if (x && typeof x.q === "string" && Array.isArray(x.options) && x.options.length === 4 && typeof x.answer === "number" && x.id) out.push({ id: String(x.id), q: x.q, options: x.options.map(String), answer: x.answer, explain: x.explain || "" });
      else skipped++;
    });
    return { items: out, skipped: skipped };
  }
  function onClick(e) {
    var b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
    var a = b.getAttribute("data-act"), sb = C().sb, id = parseInt(b.getAttribute("data-id"), 10);
    var comp = function () { return K.comps.filter(function (x) { return x.id === id; })[0]; };
    if (a === "start") { var c1 = comp(); if (c1) begin(c1);
    } else if (a === "resume") { K.retry = false; K.err = ""; act(sb.rpc("comp_state", { p_comp: K.cur.id }), function (r) { setState(r); });
    } else if (a === "pick") { send(parseInt(b.getAttribute("data-i"), 10));
    } else if (a === "back") { stopTimer(); K.view = "list"; K.err = ""; K.retry = false; K.loaded = false; K.loading = false; repaint();
    } else if (a === "results") { var c2 = comp(); if (c2) openResults(c2);
    } else if (a === "review") {
      act(sb.rpc("comp_review", { p_comp: K.cur.id }), function (r) { K.review = r.data || []; });
    } else if (a === "cend") { act(sb.rpc("admin_end_competition", { p_id: id }), function () { K.loaded = false; K.loading = false; K.msg = "Competition ended."; });
    } else if (a === "cdel") { K.confirm = id; repaint();
    } else if (a === "cno") { K.confirm = null; K.poolConfirm = null; repaint();
    } else if (a === "cdelyes") { K.confirm = null; act(sb.rpc("admin_delete_competition", { p_id: id }), function () { K.comps = K.comps.filter(function (x) { return x.id !== id; }); K.msg = "Competition deleted."; });
    } else if (a === "pooldel") { K.poolConfirm = b.getAttribute("data-pool"); repaint();
    } else if (a === "pooldelyes") {
      var pl = K.poolConfirm; K.poolConfirm = null;
      act(sb.rpc("admin_delete_comp_pool", { p_pool: pl }), function (r) { K.msg = "Deleted " + r.data + " questions."; K.loaded = false; K.loading = false; });
    } else if (a === "import") {
      var txt = (K.form["ci-text"] || "").trim(), pool = (K.form["ci-pool"] || "general").trim() || "general", parsed;
      if (!txt) { K.err = "Paste the questions first."; return repaint(); }
      try { parsed = parseItems(txt); } catch (er) { K.err = "That is not valid JSON. Paste the checker’s output exactly."; return repaint(); }
      if (!parsed.items.length) { K.err = "No usable questions found. Each needs an id, q, 4 options and a numeric answer."; return repaint(); }
      var chunks = [], i; for (i = 0; i < parsed.items.length; i += 250) chunks.push(parsed.items.slice(i, i + 250));
      var chain = Promise.resolve(0);
      chunks.forEach(function (ch) { chain = chain.then(function (n) { return sb.rpc("admin_import_comp_questions", { p_items: ch, p_pool: pool }).then(function (r) { if (r.error) throw r.error; return n + Number(r.data || 0); }); }); });
      act(chain.then(function (n) { return { data: n }; }), function (r) {
        K.msg = "Imported " + r.data + " question" + (r.data === 1 ? "" : "s") + " into “" + pool + "”." + (parsed.skipped ? " Skipped " + parsed.skipped + " that did not fit." : ""); K.form["ci-text"] = ""; K.loaded = false; K.loading = false; });
    } else if (a === "create") {
      var f = K.form, name = (f["cf-name"] || "").trim(), op = f["cf-open"] || localDT(Date.now()), cl = f["cf-close"] || localDT(Date.now() + 2 * 86400000);
      var n = parseInt(f["cf-n"] || "10", 10), sec = parseInt(f["cf-sec"] || "30", 10);
      if (name.length < 3) { K.err = "Give the competition a name."; return repaint(); }
      if (new Date(cl) <= new Date(op)) { K.err = "It must close after it opens."; return repaint(); }
      act(sb.rpc("admin_create_competition", { p_name: name, p_opens: new Date(op).toISOString(), p_closes: new Date(cl).toISOString(), p_n: n, p_sec: sec, p_pool: f["cf-pool"] || null }), function () {
        K.form["cf-name"] = ""; K.msg = "Competition created."; K.loaded = false; K.loading = false; });
    }
  }
})();
