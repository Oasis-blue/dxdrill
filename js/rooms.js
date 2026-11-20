/* Live rooms: the admin hosts, students join with a code on their phones, the server marks and times everything. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var R = { id: 0, code: "", st: null, board: null, cls: null, err: "", busy: false, form: {}, join: "", confirm: false,
            poll: null, tick: null, deadline: 0, sig: "", asked: false, fetching: false, bankPools: null };
  DX.rooms = { render: render, onClick: onClick, onInput: onInput, onKey: onKey, leave: leave };

  var css = document.createElement("style");
  css.textContent =
    ".lv{background:var(--surface);border:1.5px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}" +
    ".lv h3{font-size:19px;overflow-wrap:anywhere}.lv .tag{font-size:13px;color:var(--muted)}" +
    ".lvcode{font-family:var(--font-display);font-weight:800;font-size:clamp(40px,14vw,84px);letter-spacing:.12em;text-align:center}" +
    ".lvopt{display:block;width:100%;text-align:left;border:1.5px solid var(--line);background:var(--bg);border-radius:10px;padding:14px;min-height:52px;overflow-wrap:anywhere;font-size:16px}" +
    ".lvopt:disabled{opacity:.65}.lvopt b{display:inline-block;min-width:24px;color:var(--muted)}" +
    ".lvopt.right{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--bg))}.lvopt.mine:not(.right){border-style:dashed}.lvopt.picked{border-color:var(--accent)}" +
    ".lvopt .cnt{float:right;color:var(--muted);font-variant-numeric:tabular-nums}" +
    ".lvbar{height:8px;border-radius:99px;background:var(--surface2);overflow:hidden}.lvbar i{display:block;height:100%;background:var(--accent);transition:width .25s linear}.lvbar.low i{background:#c0392b}" +
    ".lvtime{font-family:var(--font-display);font-weight:700;font-variant-numeric:tabular-nums}" +
    ".lvf input[type=text],.lvf input[type=number],.lvf select{width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg)}" +
    ".lvt{width:100%;border-collapse:collapse;font-size:15px}.lvt th,.lvt td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}.lvt td.n,.lvt th.n{text-align:right;font-variant-numeric:tabular-nums}" +
    ".lvjoin{font-family:var(--font-display);font-weight:700;font-size:28px;letter-spacing:.2em;text-transform:uppercase;text-align:center}";
  document.head.appendChild(css);

  function C() { return DX.cloud; }
  function admin() { return !!(C().profile && C().profile.is_admin); }
  function clsLabel(id) { var c = DX.curriculum.classes.filter(function (x) { return x.id === id; })[0]; return c ? c.label : (id || ""); }
  function fv(id, d) { return R.form[id] !== undefined ? R.form[id] : d; }
  function fail(e, fb) {
    var m = (e && e.message) || "";
    if (C().isDown(e)) return "DxDrill’s online part is not answering. It may be waking up, so try again in a minute.";
    if (/room not found/i.test(m)) return "No room has that code. Check it and try again.";
    if (/room finished/i.test(m)) return "That room has already finished.";
    if (/room full/i.test(m)) return "That room is full (150 players).";
    if (/not in room/i.test(m)) return "You are not in this room. Join it with the code.";
    if (/not enough questions/i.test(m)) return "There are not enough questions for that. " + (/have (\d+)/.test(m) ? "Only " + m.match(/have (\d+)/)[1] + " available." : "");
    if (/4 options/i.test(m)) return "A question did not have exactly 4 options.";
    if (/schema cache|does not exist|room_state|admin_create_room/i.test(m)) return "Live rooms are not switched on yet. Run supabase/update-5.sql in Supabase.";
    if (/not allowed/i.test(m)) return "Only the host can do that.";
    return fb;
  }
  function stop() { if (R.poll) { clearTimeout(R.poll); R.poll = null; } if (R.tick) { clearInterval(R.tick); R.tick = null; } }
  function leave() { stop(); R.confirm = false; }
  function repaint() { if ((location.hash || "") === "#live" && app) render(app); }
  function remember() { DX.store.set("dx.room", R.id ? { id: R.id, code: R.code } : null); }

  /* ---------- talking to the server ---------- */
  function schedule() {
    if (R.poll) clearTimeout(R.poll);
    if (!R.id || (location.hash || "") !== "#live") return;
    var st = R.st, fast = st && (st.status === "question" || st.status === "lobby" || (st.status === "reveal" && st.pace === "auto"));
    R.poll = setTimeout(fetchState, (fast ? 2000 : 3500) + Math.random() * 700);
  }
  function fetchState() {
    if (!R.id || R.fetching) return;
    R.fetching = true;
    C().sb.rpc("room_state", { p_room: R.id }).then(function (r) {
      R.fetching = false;
      if (r.error) throw r.error;
      var s = r.data && r.data[0]; if (!s) throw new Error("room not found");
      R.err = ""; apply(s); schedule();
    }).catch(function (e) {
      R.fetching = false;
      if (/room not found|not in room/i.test((e && e.message) || "")) { R.id = 0; R.st = null; remember(); R.err = fail(e, ""); repaint(); return; }
      R.err = fail(e, "Connection trouble. Retrying…"); repaint(); schedule();
    });
  }
  function apply(s) {
    var old = R.st;
    if (s.status === "question" && s.my_choice == null && old && old.cur_idx === s.cur_idx && old.my_choice != null) s.my_choice = old.my_choice;
    R.st = s;
    if (s.status === "question") R.deadline = performance.now() + Number(s.secs_left) * 1000;
    var sig = [s.status, s.cur_idx, s.players, s.answered, s.my_choice, s.is_host].join("|");
    var changed = sig !== R.sig; R.sig = sig;
    if (s.status !== (old && old.status) || s.cur_idx !== (old && old.cur_idx)) { R.asked = false; R.board = null; R.cls = null; }
    if ((s.status === "reveal" || s.status === "finished") && !R.board) loadBoards(s);
    if (changed) repaint(); else tickNow();
  }
  function loadBoards(s) {
    var sb = C().sb, id = R.id, st = s.status;
    sb.rpc("room_board", { p_room: id }).then(function (r) { if (!r.error && R.id === id) { R.board = r.data || []; repaint(); } });
    if (st === "finished") sb.rpc("room_class_board", { p_room: id }).then(function (r) { if (!r.error && R.id === id) { R.cls = r.data || []; repaint(); } });
    R.board = R.board || [];
  }
  function enter(id, code) {
    R.id = id; R.code = code || R.code; R.st = null; R.board = null; R.cls = null; R.sig = ""; R.err = ""; remember(); fetchState();
  }
  function act(rpc, args, ok) {
    R.busy = true; R.err = ""; repaint();
    return C().sb.rpc(rpc, args).then(function (r) { if (r.error) throw r.error; R.busy = false; if (ok) ok(r); })
      .catch(function (e) { R.busy = false; R.err = fail(e, "That did not work. Try again."); repaint(); });
  }
  function join() {
    var code = (R.join || "").trim().toUpperCase(); if (!code) { R.err = "Type the code on the screen."; repaint(); return; }
    act("room_join", { p_code: code }, function (r) { var row = r.data && r.data[0]; if (row) { R.join = ""; enter(row.room_id, code); } });
  }
  function answer(i) {
    var s = R.st; if (!s || s.status !== "question" || s.my_choice != null || R.asked) return;
    R.asked = true; s.my_choice = i; R.sig = ""; repaint();
    C().sb.rpc("room_answer", { p_room: R.id, p_idx: s.cur_idx, p_choice: i }).then(function (r) { if (r.error) throw r.error; fetchState(); })
      .catch(function (e) { R.asked = false; s.my_choice = null; R.err = fail(e, "Could not send your answer. Tap again."); repaint(); });
  }

  /* ---------- host: creating a room ---------- */
  function publicQs(scopeId, n) {
    var qs = DX.questions.filter(function (q) { return q.options && q.options.length === 4 && typeof q.answer === "number" && q.answer >= 0 && q.answer < 4 && (!scopeId || q.subject === scopeId || q.area === scopeId || q.topic === scopeId); });
    return DX.shuffle(qs).slice(0, n).map(function (q) { return { q: q.q || q.text || q.stem, options: q.options, answer: q.answer, explain: q.explain || "" }; });
  }
  function create() {
    var name = (fv("lf-name", "") || "").trim() || "Live quiz", n = Math.max(1, Math.min(50, parseInt(fv("lf-n", "10"), 10) || 10)),
        sec = Math.max(5, Math.min(300, parseInt(fv("lf-sec", "20"), 10) || 20)), pace = fv("lf-pace", "host"), src = fv("lf-src", "items"), args;
    if (name.length < 2) name = "Live quiz";
    if (src === "bank") args = { p_name: name, p_pace: pace, p_sec: sec, p_n: n, p_source: "bank", p_pool: fv("lf-pool", "") || null, p_items: null };
    else {
      var items = publicQs(fv("lf-scope", ""), n);
      if (items.length < n) { R.err = "Only " + items.length + " public questions match that choice. Lower the number or pick a wider scope."; repaint(); return; }
      args = { p_name: name, p_pace: pace, p_sec: sec, p_n: n, p_source: "items", p_pool: null, p_items: items };
    }
    act("admin_create_room", args, function (r) { var row = r.data && r.data[0]; if (row) enter(row.room_id, row.code); });
  }
  function loadPools() {
    if (R.bankPools || !admin()) return; R.bankPools = [];
    C().sb.rpc("admin_comp_bank").then(function (r) { if (!r.error) { R.bankPools = r.data || []; repaint(); } });
  }

  /* ---------- pieces of screen ---------- */
  var L = ["A", "B", "C", "D"];
  function boardHtml(rows, cap) {
    if (!rows || !rows.length) return '<p class="muted">No scores yet.</p>';
    return '<div style="overflow-x:auto"><table class="lvt"><thead><tr><th class="n">#</th><th>Name</th><th>Class</th><th class="n">Points</th></tr></thead><tbody>' +
      rows.slice(0, cap || 10).map(function (x, i) { return '<tr><td class="n">' + (i + 1) + '</td><td>' + esc(x.display_name) + '</td><td>' + esc(clsLabel(x.class_id)) + '</td><td class="n">' + x.score + '</td></tr>'; }).join("") + '</tbody></table></div>';
  }
  function classHtml(rows) {
    if (!rows || !rows.length) return "";
    return '<h3>Class averages</h3><div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Class</th><th class="n">Players</th><th class="n">Average</th></tr></thead><tbody>' +
      rows.map(function (x) { return '<tr><td>' + esc(clsLabel(x.class_id)) + '</td><td class="n">' + x.players + '</td><td class="n">' + x.avg_score + '</td></tr>'; }).join("") + '</tbody></table></div>';
  }
  function timerHtml(s) {
    return '<div class="row tight" style="justify-content:space-between"><span class="tag">Question ' + (Number(s.cur_idx) + 1) + ' of ' + s.n + '</span><span class="lvtime" id="lv-t" aria-live="off">' + Math.ceil(Number(s.secs_left)) + 's</span></div><div class="lvbar" id="lv-b"><i style="width:' + Math.min(100, Number(s.secs_left) * 100 / s.sec) + '%"></i></div>';
  }
  function optionsHtml(s, interactive) {
    var reveal = s.status === "reveal" || s.status === "finished";
    return (s.q_options || []).map(function (o, i) {
      var cls = "lvopt" + (reveal && i === s.right_answer ? " right" : "") + (reveal && s.my_choice === i ? " mine" : "") + (!reveal && s.my_choice === i ? " picked" : "");
      var cnt = reveal && s.option_counts ? '<span class="cnt">' + s.option_counts[i] + '</span>' : "";
      return '<button class="' + cls + '" data-act="pick" data-i="' + i + '"' + (interactive && s.my_choice == null ? "" : " disabled") + '><b>' + L[i] + '</b>' + cnt + esc(o) + '</button>';
    }).join("");
  }
  function hostHtml(s) {
    var b = R.busy ? " disabled" : "", out = "";
    var meta = '<p class="tag">' + esc(s.name) + ' · ' + s.players + ' joined · ' + (s.pace === "auto" ? "timers move it on" : "you tap Next") + '</p>';
    if (s.status === "lobby") {
      out = '<section class="lv"><p class="tag">Go to DxDrill, open Live, and type</p><div class="lvcode" aria-label="Room code">' + esc(R.code) + '</div>' + meta +
        '<div class="row tight"><button class="btn primary" data-act="start"' + b + '>Start (' + s.players + ' joined)</button><button class="btn ghost small" data-act="del">Close room</button></div></section>';
    } else if (s.status === "question") {
      out = '<section class="lv">' + timerHtml(s) + '<h3>' + esc(s.q_text) + '</h3>' + optionsHtml(s, false) + '<p class="tag">' + s.answered + ' of ' + s.players + ' answered</p>' +
        '<div class="row tight"><button class="btn primary" data-act="next"' + b + '>Show the answer now</button></div>' + meta + '</section>';
    } else if (s.status === "reveal") {
      var last = Number(s.cur_idx) + 1 >= Number(s.n);
      out = '<section class="lv"><span class="tag">Question ' + (Number(s.cur_idx) + 1) + ' of ' + s.n + '</span><h3>' + esc(s.q_text) + '</h3>' + optionsHtml(s, false) +
        (s.explain ? '<p>' + esc(s.explain) + '</p>' : "") + '<h3>Top 5</h3>' + boardHtml(R.board, 5) +
        '<div class="row tight"><button class="btn primary" data-act="next"' + b + '>' + (last ? "Finish and show results" : "Next question") + '</button></div>' + meta + '</section>';
    } else {
      out = '<section class="lv"><h3>Final results</h3>' + boardHtml(R.board, 10) + classHtml(R.cls) +
        '<div class="row tight"><button class="btn ghost small" data-act="leaveroom">Back</button><button class="btn ghost small" data-act="del">Delete room</button></div></section>';
    }
    if (R.confirm) out += '<p class="note bad">Delete this room? Everyone loses it.</p><div class="row tight"><button class="btn small primary" data-act="delyes">Yes, delete</button><button class="btn ghost small" data-act="delno">Keep</button></div>';
    return out;
  }
  function playerHtml(s) {
    var out;
    if (s.status === "lobby") out = '<section class="lv"><h3>You are in</h3><p>' + esc(s.name) + '</p><p class="tag">' + s.players + ' joined. Waiting for the host to start…</p></section>';
    else if (s.status === "question") {
      out = '<section class="lv">' + timerHtml(s) + '<h3>' + esc(s.q_text) + '</h3>' + optionsHtml(s, true) +
        (s.my_choice != null ? '<p class="tag">Locked in. Wait for the answer…</p>' : '<p class="tag">Faster right answers earn more points.</p>') + '</section>';
    } else if (s.status === "reveal") {
      var ok = s.my_choice != null && s.my_choice === s.right_answer;
      out = '<section class="lv"><h3>' + (s.my_choice == null ? "No answer in time" : ok ? "Correct! +" + s.my_points : "Not quite") + '</h3>' + optionsHtml(s, false) +
        (s.explain ? '<p>' + esc(s.explain) + '</p>' : "") + '<p class="tag">Your score ' + s.my_score + ' · rank ' + s.my_rank + ' of ' + s.players + '</p><h3>Top 5</h3>' + boardHtml(R.board, 5) +
        '<p class="tag">' + (s.pace === "auto" ? "Next question starting…" : "Waiting for the host…") + '</p></section>';
    } else out = '<section class="lv"><h3>Finished</h3><p>You scored <b>' + s.my_score + '</b> and ranked <b>' + s.my_rank + '</b> of ' + s.players + '.</p>' + boardHtml(R.board, 10) + classHtml(R.cls) +
      '<div class="row tight"><button class="btn small" data-act="leaveroom">Done</button></div></section>';
    return out;
  }
  function homeHtml() {
    var out = '<section class="lv"><h3>Join a live quiz</h3><p class="tag">Type the code shown by the host.</p><input class="lvjoin" id="lj-code" type="text" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" value="' + esc(R.join) + '" aria-label="Room code">' +
      '<div class="row tight"><button class="btn primary" data-act="join"' + (R.busy ? " disabled" : "") + '>Join</button></div></section>';
    var last = DX.store.get("dx.room", null);
    if (last && last.code) out += '<div class="row tight"><button class="btn ghost small" data-act="back" data-id="' + last.id + '" data-code="' + esc(last.code) + '">Return to room ' + esc(last.code) + '</button></div>';
    if (admin()) out += createHtml();
    return out;
  }
  function createHtml() {
    loadPools();
    var scopes = '<option value="">Everything</option>' + DX.curriculum.subjects.map(function (s) { return '<option value="' + esc(s.id) + '"' + (fv("lf-scope", "") === s.id ? " selected" : "") + '>' + esc(s.name) + '</option>'; }).join("");
    var pools = '<option value="">Whole bank</option>' + (R.bankPools || []).map(function (b) { return '<option value="' + esc(b.pool) + '"' + (fv("lf-pool", "") === b.pool ? " selected" : "") + '>' + esc(b.pool) + ' (' + b.questions + ')</option>'; }).join("");
    var src = fv("lf-src", "items"), pace = fv("lf-pace", "host");
    return '<section class="section stack lvf"><h2>Host a room</h2>' +
      '<div class="field"><label class="label" for="lf-name">Name</label><input type="text" id="lf-name" maxlength="60" value="' + esc(fv("lf-name", "")) + '" placeholder="Live quiz"></div>' +
      '<div class="field"><label class="label" for="lf-src">Questions from</label><select id="lf-src"><option value="items"' + (src === "items" ? " selected" : "") + '>Public practice questions</option><option value="bank"' + (src === "bank" ? " selected" : "") + '>Hidden bank (students never see them beforehand)</option></select></div>' +
      (src === "bank" ? '<div class="field"><label class="label" for="lf-pool">Pool</label><select id="lf-pool">' + pools + '</select></div>' : '<div class="field"><label class="label" for="lf-scope">Subject</label><select id="lf-scope">' + scopes + '</select></div>') +
      '<div class="field"><label class="label" for="lf-pace">Pace</label><select id="lf-pace"><option value="host"' + (pace === "host" ? " selected" : "") + '>I tap Next</option><option value="auto"' + (pace === "auto" ? " selected" : "") + '>Timers move on by themselves</option></select></div>' +
      '<div class="teamrow"><div class="field"><label class="label" for="lf-n">Questions</label><input type="number" id="lf-n" min="1" max="50" value="' + esc(fv("lf-n", "10")) + '"></div>' +
      '<div class="field"><label class="label" for="lf-sec">Seconds each</label><input type="number" id="lf-sec" min="5" max="300" value="' + esc(fv("lf-sec", "20")) + '"></div></div>' +
      '<p class="hint">Up to 150 players. Best on a projector or shared screen. Rooms are cleaned up after 2 days.</p>' +
      '<div class="row tight"><button class="btn primary" data-act="create"' + (R.busy ? " disabled" : "") + '>Create room</button></div></section>';
  }

  /* ---------- page ---------- */
  function tickNow() {
    var s = R.st; if (!s || s.status !== "question") return;
    var left = Math.max(0, R.deadline - performance.now()), t = document.getElementById("lv-t"), bar = document.getElementById("lv-b");
    if (t) t.textContent = Math.ceil(left / 1000) + "s";
    if (bar) { bar.firstChild.style.width = Math.min(100, left * 100 / s.sec) + "%"; bar.className = "lvbar" + (left < 6000 ? " low" : ""); }
  }
  function render(a) {
    app = a; var c = C();
    if (!c || !c.ok) { a.innerHTML = '<div class="wrap stack"><h1>Live</h1><p class="lede">Live rooms could not load. Check your connection and refresh.</p></div>'; return; }
    if (!c.user) { a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Live</p><h1>Sign in to join</h1><p class="lede">Live quizzes run on your phone with a code from the host.</p></header><a class="btn primary" href="#account">Sign in</a></div>'; return; }
    var note = R.err ? '<p class="note bad" role="alert">' + esc(R.err) + '</p>' : "", body, head = "";
    if (R.id && R.st) body = R.st.is_host ? hostHtml(R.st) : playerHtml(R.st);
    else if (R.id) body = '<p class="muted">Joining…</p>';
    else { head = '<header><p class="eyebrow">Live</p><h1>Live rooms</h1><p class="lede">Join with a code and race your classmates. Right answers count more the faster you are.</p></header>'; body = homeHtml(); }
    a.innerHTML = '<div class="wrap stack">' + head + note + body + '</div>';
    ["lf-name", "lf-n", "lf-sec"].forEach(function (id) { var el = document.getElementById(id); if (el && R.form[id] !== undefined) el.value = R.form[id]; });
    if (R.id && !R.poll && !R.fetching) schedule();
    if (R.id && !R.tick) R.tick = setInterval(tickNow, 250);
    if (!R.id && R.tick) { clearInterval(R.tick); R.tick = null; }
    tickNow();
  }
  function onInput(e) {
    var id = e.target && e.target.id; if (!id) return;
    if (id === "lj-code") R.join = e.target.value.toUpperCase();
    else if (/^lf-/.test(id)) R.form[id] = e.target.value;
  }
  function onKey(e) {
    if (e.target && e.target.id === "lj-code" && e.key === "Enter") { join(); return; }
    if (!R.st || R.st.status !== "question" || R.st.is_host || (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
    var i = "abcd".indexOf(e.key.toLowerCase()); if (i < 0) i = ["1", "2", "3", "4"].indexOf(e.key);
    if (i >= 0) answer(i);
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!t) return;
    var a = t.getAttribute("data-act");
    if (a === "join") join();
    else if (a === "pick") answer(parseInt(t.getAttribute("data-i"), 10));
    else if (a === "create") create();
    else if (a === "back") enter(parseInt(t.getAttribute("data-id"), 10), t.getAttribute("data-code"));
    else if (a === "start") act("room_start", { p_room: R.id }, fetchState);
    else if (a === "next") act("room_next", { p_room: R.id }, fetchState);
    else if (a === "del") { R.confirm = true; repaint(); }
    else if (a === "delno") { R.confirm = false; repaint(); }
    else if (a === "delyes") { var id = R.id; R.confirm = false; act("admin_delete_room", { p_room: id }, function () { stop(); R.id = 0; R.st = null; remember(); repaint(); }); }
    else if (a === "leaveroom") { stop(); R.id = 0; R.st = null; R.err = ""; remember(); repaint(); }
    else if (a === "change") { R.form["lf-src"] = document.getElementById("lf-src").value; repaint(); }
  }
  /* The source and pace selects change what the form shows. */
  document.addEventListener("change", function (e) {
    if ((location.hash || "") === "#live" && e.target && e.target.id === "lf-src") { R.form["lf-src"] = e.target.value; repaint(); }
  });
})();
