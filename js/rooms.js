/* Live rooms: the admin hosts, students join with a code on their phones, the server marks and times everything. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var R = { id: 0, code: "", st: null, board: null, cls: null, err: "", busy: false, form: {}, join: "", confirm: false,
            poll: null, tick: null, deadline: 0, startAt: 0, inLead: false, lastN: 0, lastTick: -1, shownScore: 0, fxIdx: -2, sig: "", asked: false, fetching: false, bankPools: null };
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
    ".lv h3{white-space:pre-line}.lvjoin{font-family:var(--font-display);font-weight:700;font-size:28px;letter-spacing:.2em;text-transform:uppercase;text-align:center}";
  document.head.appendChild(css);

  function C() { return DX.cloud; }
  function hostOnly(s) { return !!(s && s.is_host && s.kind !== "friends"); }   /* a friend-room host plays too */
  function admin() { return !!(C().profile && C().profile.is_admin); }
  function clsLabel(id) { var c = DX.curriculum.classes.filter(function (x) { return x.id === id; })[0]; return c ? c.label : (id || ""); }
  function fv(id, d) { return R.form[id] !== undefined ? R.form[id] : d; }
  function fail(e, fb) {
    var m = (e && e.message) || "";
    if (C().isDown(e)) return "DxDrill’s online part is not answering. It may be waking up, so try again in a minute.";
    if (/room not found/i.test(m)) return "No room has that code. Check it and try again.";
    if (/room finished/i.test(m)) return "That room has already finished.";
    if (/room full/i.test(m)) return "That room is full. Ask the host to make a new one.";
    if (/you have a room open/i.test(m)) return "You already have a room open. Finish it or close it first. Use “Return to room” below.";
    if (/too many rooms today/i.test(m)) return "You have made all your rooms for today. Try again tomorrow.";
    if (/busy right now/i.test(m)) return "Lots of groups are playing right now. Try again in a few minutes.";
    if (/need a friend/i.test(m)) return "You need at least 2 players to start. Share the code with a friend first.";
    if (/cannot change team now/i.test(m)) return "Teams are locked once the quiz has started.";
    if (/not your turn to describe/i.test(m)) return "It is not your turn to describe in this round.";
    if (/bad teams|bad count/i.test(m)) return "Check the number of teams (2 to 6) and the question count (50 at most).";
    if (/not open yet/i.test(m)) return "Practice with friends is not open yet.";
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
    if (s.status === "question") { R.deadline = performance.now() + Number(s.secs_left) * 1000; R.startAt = R.deadline - Number(s.sec) * 1000; if (performance.now() < R.startAt) R.inLead = true; }
    var mode = hostOnly(s) ? "all" : "live", fx = DX.fx;
    if (fx && old && old.status !== s.status) {
      if (s.status === "reveal" && !hostOnly(s)) { var good = s.q_kind === "describe" ? Number(s.my_points) > 0 : (s.my_choice != null && s.my_choice === s.right_answer); fx.play(good ? "ok" : "bad", mode); fx.buzz(good ? 15 : 40); }
      else if (s.status === "finished") fx.play("done", mode);
    }
    var sig = [s.status, s.cur_idx, s.players, s.answered, s.my_choice, s.is_host, s.my_team, s.role, (s.team_counts || []).join(","), JSON.stringify(s.describers || ""), R.descDone === s.cur_idx].join("|");
    var changed = sig !== R.sig; R.sig = sig;
    if (s.status !== (old && old.status) || s.cur_idx !== (old && old.cur_idx)) { R.asked = false; R.board = null; R.cls = null; R.teamBoard = null; }
    if ((s.status === "reveal" || s.status === "finished") && !R.board) loadBoards(s);
    if (changed) repaint(); else tickNow();
  }
  function loadBoards(s) {
    var sb = C().sb, id = R.id, st = s.status;
    sb.rpc("room_board", { p_room: id }).then(function (r) { if (!r.error && R.id === id) { R.board = r.data || []; repaint(); } });
    if (st === "finished") sb.rpc("room_class_board", { p_room: id }).then(function (r) { if (!r.error && R.id === id) { R.cls = r.data || []; repaint(); } });
    if (s.n_teams > 0) sb.rpc("room_team_board", { p_room: id }).then(function (r) { if (!r.error && R.id === id) { R.teamBoard = r.data || []; repaint(); } });
    R.board = R.board || [];
  }
  function enter(id, code) {
    R.id = id; R.code = code || R.code; R.st = null; R.shownScore = 0; R.fxIdx = -2; R.board = null; R.cls = null; R.teamBoard = null; R.descDone = -1; R.sig = ""; R.err = ""; remember(); fetchState();
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
  function inScope(c, scope) {
    if (!scope) return true;
    var p = scope.indexOf(":") > 0 ? scope.split(":") : ["s", scope];
    return p[0] === "s" ? c.subject === p[1] : p[0] === "a" ? c.area === p[1] : c.topic === p[1];
  }
  function publicQs(scope, n) {
    var qs = DX.questions.filter(function (q) { return q.options && q.options.length === 4 && typeof q.answer === "number" && q.answer >= 0 && q.answer < 4 && inScope(q, scope); });
    return DX.shuffle(qs).slice(0, n).map(function (q) {
      var ord = DX.optOrder(q.options);   /* the same shuffled order goes to everyone, so options are not always A-first */
      return { q: q.q || q.text || q.stem, options: ord.map(function (i) { return q.options[i]; }), answer: ord.indexOf(q.answer), explain: q.explain || "" };
    });
  }
  /* "Guess the term": the clues are the question, the term and three look-alike terms are the options. */
  function termQs(scope, n) {
    var all = DX.terms.filter(function (t) { return t.clues && t.clues.length; }), mine = all.filter(function (t) { return inScope(t, scope); });
    return DX.shuffle(mine).slice(0, n).map(function (t) {
      var near = DX.shuffle(all.filter(function (x) { return x.term !== t.term && x.topic === t.topic; })), far = DX.shuffle(all.filter(function (x) { return x.term !== t.term && x.topic !== t.topic; }));
      var wrong = near.concat(far).filter(function (x, i, arr) { return arr.findIndex(function (y) { return y.term === x.term; }) === i; }).slice(0, 3).map(function (x) { return x.term; });
      if (wrong.length < 3) return null;
      var opts = DX.shuffle(wrong.concat([t.term]));
      return { q: "Which term fits these clues?\n\u2022 " + t.clues.join("\n\u2022 "), options: opts, answer: opts.indexOf(t.term), explain: t.term };
    }).filter(Boolean);
  }
  function friendCreate() {
    var name = (fv("ff-name", "") || "").trim() || "Study round", n = Math.max(3, Math.min(20, parseInt(fv("ff-n", "8"), 10) || 8)),
        sec = Math.max(10, Math.min(60, parseInt(fv("ff-sec", "20"), 10) || 20)), pace = fv("ff-pace", "host"), kind = fv("ff-kind", "q"), scope = fv("ff-scope", "");
    var items = (kind === "t" ? termQs(scope, n) : publicQs(scope, n));
    if (items.length < n) { R.err = "Only " + items.length + " " + (kind === "t" ? "terms" : "questions") + " match that choice. Lower the number or pick a wider topic."; repaint(); return; }
    act("friend_create_room", { p_name: name, p_pace: pace, p_sec: sec, p_n: n, p_items: items }, function (r) { var row = r.data && r.data[0]; if (row) enter(row.room_id, row.code); });
  }
  function create() {
    var name = (fv("lf-name", "") || "").trim() || "Live quiz", n = Math.max(1, Math.min(50, parseInt(fv("lf-n", "10"), 10) || 10)),
        sec = Math.max(5, Math.min(300, parseInt(fv("lf-sec", "20"), 10) || 20)), pace = fv("lf-pace", "host"), src = fv("lf-src", "items"), args;
    if (name.length < 2) name = "Live quiz";
    if (fv("lf-type", "solo") === "team") {
      var tn = Math.max(2, Math.min(6, parseInt(fv("lf-teams", "3"), 10) || 3)), nd = Math.max(0, Math.min(8, parseInt(fv("lf-nd", "2"), 10) || 0)), scope = fv("lf-scope", "");
      if (n + nd > 50) { R.err = "Quiz questions plus describe rounds can be 50 at most."; repaint(); return; }
      var terms = DX.shuffle(DX.terms.filter(function (t) { return t.forbidden && t.forbidden.length && inScope(t, scope); })).slice(0, nd * tn).map(function (t) { return { term: t.term, forbidden: t.forbidden }; });
      if (terms.length < nd * tn) { R.err = "Only " + terms.length + " usable terms match that subject. You need " + (nd * tn) + " (" + nd + " rounds x " + tn + " teams). Lower the rounds or pick Everything."; repaint(); return; }
      var items2 = null;
      if (src !== "bank") { items2 = publicQs(scope, n); if (items2.length < n) { R.err = "Only " + items2.length + " public questions match that choice."; repaint(); return; } }
      act("admin_create_team_room", { p_name: name, p_pace: pace, p_sec: sec, p_teams: tn, p_source: src === "bank" ? "bank" : "items", p_pool: src === "bank" ? (fv("lf-pool", "") || null) : null, p_n_quiz: n, p_items: items2, p_terms: terms }, function (r) { var row = r.data && r.data[0]; if (row) enter(row.room_id, row.code); });
      return;
    }
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
  var L = ["A", "B", "C", "D"], TEAMS = ["Red", "Blue", "Green", "Orange", "Purple", "Teal"], TCOL = ["#c0392b", "#2c6fbb", "#1b7f4a", "#c26a10", "#7b4bb3", "#14808a"];
  function teamTag(i) { return '<span style="color:' + TCOL[i - 1] + ';font-weight:700">\u25CF ' + TEAMS[i - 1] + '</span>'; }
  function teamBoardHtml(rows) {
    if (!rows || !rows.length) return "";
    return '<h3>Teams</h3><div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Team</th><th class="n">Players</th><th class="n">Quiz</th><th class="n">Describe</th><th class="n">Total</th></tr></thead><tbody>' +
      rows.map(function (x) { return '<tr><td>' + teamTag(x.team) + '</td><td class="n">' + x.players + '</td><td class="n">' + x.quiz_pts + '</td><td class="n">' + x.describe_pts + '</td><td class="n"><b>' + x.total + '</b></td></tr>'; }).join("") + '</tbody></table></div>';
  }
  function teamCounts(s) {
    var out = ""; for (var i = 1; i <= s.n_teams; i++) out += '<span style="margin-right:12px">' + teamTag(i) + ' ' + ((s.team_counts || [])[i - 1] || 0) + '</span>'; return '<p>' + out + '</p>';
  }
  function teamPicker(s) {
    var out = '<p class="tag">Pick your team</p><div class="row tight" style="flex-wrap:wrap">';
    for (var i = 1; i <= s.n_teams; i++) out += '<button class="btn small' + (s.my_team === i ? " primary" : "") + '" data-act="team" data-t="' + i + '" aria-pressed="' + (s.my_team === i) + '" style="border-color:' + TCOL[i - 1] + '">' + TEAMS[i - 1] + ' (' + ((s.team_counts || [])[i - 1] || 0) + ')</button>';
    return out + '</div>';
  }
  function describeHost(s, b) {
    var rows = (s.describers || []).map(function (d) {
      return '<tr><td>' + teamTag(d.team) + '</td><td>' + esc(d.describer || "?") + '</td><td>' + (d.done ? "Tapped \u2713" : "Describing\u2026") + '</td><td>' + (d.done ? '<button class="btn ghost small" data-act="void" data-team="' + d.team + '"' + b + '>Void</button>' : "") + '</td></tr>';
    }).join("");
    return '<p class="tag">Each team has its own term. Listen for forbidden words. Void a tap if the team cheated.</p><p class="stem" style="white-space:pre-line">' + esc(s.q_text) + '</p>' +
      '<div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Team</th><th>Describer</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function describePlayer(s) {
    if (s.role === "describer") {
      var forb = (s.q_options || []).map(function (f) { return '<span class="chip">' + esc(f) + '</span>'; }).join(" ");
      return '<section class="lv">' + timerHtml(s) + '<p class="tag">You describe for your team. Do not say the term or these words:</p><h3 style="font-size:28px">' + esc(s.q_text) + '</h3><p>' + (forb || '<span class="muted">No forbidden words.</span>') + '</p>' +
        (R.descDone === s.cur_idx ? '<p class="tag">Sent. Wait for the quizmaster\u2026</p>' : '<div class="row tight"><button class="btn primary" data-act="descdone"' + (R.busy ? " disabled" : "") + '>My team got it</button></div>') + '</section>';
    }
    return '<section class="lv">' + timerHtml(s) + '<h3>' + esc(s.q_text) + '</h3><p class="tag">Say your guesses out loud. The describer taps when you get it.</p></section>';
  }
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
  function shown(s) { return Math.min(Number(s.sec), Math.max(0, (R.deadline - performance.now()) / 1000)); }
  function leading() { return !!(R.st && R.st.status === "question" && performance.now() < R.startAt); }
  function readyHtml(s) {
    return '<section class="lv" style="text-align:center"><p class="tag">Question ' + (Number(s.cur_idx) + 1) + ' of ' + s.n + '</p><h3>Get ready</h3><div class="lvcode" id="lv-ready">' + Math.max(1, Math.ceil((R.startAt - performance.now()) / 1000)) + '</div></section>';
  }
  function timerHtml(s) {
    return '<div class="row tight" style="justify-content:space-between"><span class="tag">Question ' + (Number(s.cur_idx) + 1) + ' of ' + s.n + '</span><span class="lvtime" id="lv-t" aria-live="off">' + Math.ceil(shown(s)) + 's</span></div><div class="lvbar" id="lv-b"><i style="width:' + Math.min(100, shown(s) * 100 / s.sec) + '%"></i></div>';
  }
  function optionsHtml(s, interactive) {
    var reveal = s.status === "reveal" || s.status === "finished";
    return (s.q_options || []).map(function (o, i) {
      var cls = "lvopt" + (reveal && i === s.right_answer ? " right" : "") + (reveal && s.my_choice === i ? " mine" : "") + (!reveal && s.my_choice === i ? " picked" : "");
      var cnt = reveal && s.option_counts ? '<span class="cnt">' + s.option_counts[i] + '</span>' : "";
      if (reveal && i === s.right_answer) cnt += '<span class="fxmk ok">\u2713 ' + (s.my_choice === i ? "Your answer" : "Right answer") + '</span>';
      else if (reveal && s.my_choice === i) cnt += '<span class="fxmk no">\u2717 Your answer</span>';
      return '<button class="' + cls + '" data-act="pick" data-i="' + i + '"' + (interactive && s.my_choice == null ? "" : " disabled") + '><b>' + L[i] + '</b>' + cnt + esc(o) + '</button>';
    }).join("");
  }
  function hostHtml(s) {
    var b = R.busy ? " disabled" : "", out = "";
    var meta = '<p class="tag">' + esc(s.name) + ' · ' + s.players + ' joined · ' + (s.pace === "auto" ? "timers move it on" : "you tap Next") + '</p>';
    if (s.status === "lobby") {
      out = '<section class="lv"><p class="tag">Go to DxDrill, open Live, and type</p><div class="lvcode" aria-label="Room code">' + esc(R.code) + '</div>' + meta +
        (s.n_teams ? teamCounts(s) + '<p class="tag">Players pick a team on their phone. Anyone who does not pick joins the smallest team when you start.</p>' : "") +
        '<div class="row tight"><button class="btn primary" data-act="start"' + b + '>Start (' + s.players + ' joined)</button><button class="btn ghost small" data-act="del">Close room</button></div></section>';
    } else if (s.status === "question" && leading()) {
      out = readyHtml(s);
    } else if (s.status === "question" && s.q_kind === "describe") {
      out = '<section class="lv">' + timerHtml(s) + describeHost(s, b) + '<div class="row tight"><button class="btn primary" data-act="next"' + b + '>Show the answer now</button></div>' + meta + '</section>';
    } else if (s.status === "question") {
      out = '<section class="lv">' + timerHtml(s) + '<h3>' + esc(s.q_text) + '</h3>' + optionsHtml(s, false) + '<p class="tag">' + s.answered + ' of ' + s.players + ' answered</p>' +
        '<div class="row tight"><button class="btn primary" data-act="next"' + b + '>Show the answer now</button></div>' + meta + '</section>';
    } else if (s.status === "reveal") {
      var last = Number(s.cur_idx) + 1 >= Number(s.n);
      out = '<section class="lv"><span class="tag">Question ' + (Number(s.cur_idx) + 1) + ' of ' + s.n + '</span><h3>' + esc(s.q_text) + '</h3>' + optionsHtml(s, false) +
        (s.explain ? '<p>' + esc(s.explain) + '</p>' : "") + (s.n_teams ? teamBoardHtml(R.teamBoard) : "") + '<h3>Top 5</h3>' + boardHtml(R.board, 5) +
        '<div class="row tight"><button class="btn primary" data-act="next"' + b + '>' + (last ? "Finish and show results" : "Next question") + '</button></div>' + meta + '</section>';
    } else {
      out = '<section class="lv"><h3>Final results</h3>' + (s.n_teams ? teamBoardHtml(R.teamBoard) + '<h3>Top players</h3>' : "") + boardHtml(R.board, 10) + classHtml(R.cls) +
        '<div class="row tight"><button class="btn ghost small" data-act="leaveroom">Back</button><button class="btn ghost small" data-act="del">Delete room</button></div></section>';
    }
    if (R.confirm) out += '<p class="note bad">Delete this room? Everyone loses it.</p><div class="row tight"><button class="btn small primary" data-act="delyes">Yes, delete</button><button class="btn ghost small" data-act="delno">Keep</button></div>';
    return out;
  }
  function playerHtml(s) {
    var out;
    var tl = s.my_team ? '<p class="tag">' + teamTag(s.my_team) + ' team</p>' : "";
    if (s.status === "lobby") out = '<section class="lv"><h3>You are in</h3><p>' + esc(s.name) + '</p>' + (s.n_teams ? teamPicker(s) : "") + '<p class="tag">' + s.players + ' joined. Waiting for the host to start…</p></section>';
    else if (s.status === "question" && leading()) out = readyHtml(s) + tl;
    else if (s.status === "question" && s.q_kind === "describe") out = describePlayer(s) + tl;
    else if (s.status === "question") {
      out = '<section class="lv">' + timerHtml(s) + '<h3>' + esc(s.q_text) + '</h3>' + optionsHtml(s, true) +
        (s.my_choice != null ? '<p class="tag">Locked in. Wait for the answer…</p>' : '<p class="tag">Faster right answers earn more points.</p>') + '</section>';
    } else if (s.status === "reveal") {
      var ok = s.my_choice != null && s.my_choice === s.right_answer, dsc = s.q_kind === "describe";
      out = '<section class="lv"><h3>' + (dsc ? (Number(s.my_points) > 0 ? "Your team scored +" + s.my_points : "No points this round") : s.my_choice == null ? "No answer in time" : ok ? "Correct! +" + s.my_points : "Not quite") + '</h3>' + (dsc ? '<p class="stem" style="white-space:pre-line">' + esc(s.q_text) + '</p>' : optionsHtml(s, false)) + tl +
        (s.explain ? '<p>' + esc(s.explain) + '</p>' : "") + '<p class="tag">Your score <b id="lv-score" data-to="' + s.my_score + '">' + R.shownScore + '</b> · rank ' + s.my_rank + ' of ' + s.players + '</p>' + (s.n_teams ? teamBoardHtml(R.teamBoard) : "") + '<h3>Top 5</h3>' + boardHtml(R.board, 5) +
        '<p class="tag">' + (s.pace === "auto" ? "Next question starting…" : "Waiting for the host…") + '</p></section>';
    } else out = '<section class="lv"><h3>Finished</h3><p>You scored <b id="lv-score" data-to="' + s.my_score + '">' + R.shownScore + '</b> and ranked <b>' + s.my_rank + '</b> of ' + s.players + '.</p>' + (s.n_teams ? teamBoardHtml(R.teamBoard) : "") + boardHtml(R.board, 10) + classHtml(R.cls) +
      '<div class="row tight"><button class="btn small" data-act="leaveroom">Done</button></div></section>';
    return out;
  }
  function toolsHtml() {
    return '<section class="lv"><h3>Helper screens (no sign-in needed)</h3><p class="tag">Not playing? Use another device to help run a session.</p>' +
      '<div class="row tight"><a class="btn small" href="#screen" style="text-decoration:none">Big screen (projector)</a><a class="btn small" href="#remote" style="text-decoration:none">Quizmaster phone (Hall mode)</a></div>' +
      '<p class="hint">Big screen shows a live room\u2019s questions and scores for the whole room. Quizmaster phone controls a Hall mode session privately. Both ask for the code the host sees.</p></section>';
  }
  function screenRow(s) {
    if (!s.is_host || s.status === "finished" || !R.code) return "";
    return '<p class="hint">For a projector: <a href="' + esc(location.pathname + "#screen?c=" + R.code) + '" target="_blank" rel="noopener">open the big screen</a> in a new tab, then use the full-screen button. It only shows the question and scores, never the answer before the reveal. Anyone with the link can watch without joining.</p>' +
      '<div class="row tight"><button class="btn small" data-act="scrcopy">Copy big-screen link</button></div>' + (R.scrNote ? '<p class="note" role="status">' + esc(R.scrNote) + '</p>' : "");
  }
  function exitRow(s) {
    if (s.status !== "question" && s.status !== "reveal") return "";
    var host = !!s.is_host;
    return '<div class="row tight" style="margin-top:10px"><button class="btn ghost small" data-act="leaveroom">Leave room</button>' + (host ? '<button class="btn ghost small" data-act="del">Close room</button>' : "") + '</div>' +
      (host ? '<p class="hint">Leaving keeps the room running. You can come back with the Back button on the Live page. Closing deletes it for everyone.</p>' : '<p class="hint">You can rejoin with the same code while the quiz is running.</p>') +
      (R.confirm && !hostOnly(s) ? '<p class="note bad">Close this room? Everyone loses it.</p><div class="row tight"><button class="btn small primary" data-act="delyes">Yes, close it</button><button class="btn ghost small" data-act="delno">Keep</button></div>' : "");
  }
  function scopeOptions() {
    var cur = fv("ff-scope", ""), out = '<option value="">Everything</option>';
    DX.curriculum.subjects.forEach(function (s) {
      out += '<optgroup label="' + esc(s.name) + '"><option value="s:' + esc(s.id) + '"' + (cur === "s:" + s.id ? " selected" : "") + '>All of ' + esc(s.name) + '</option>';
      s.areas.forEach(function (a) { a.topics.forEach(function (tp) {
        if (tp.count || DX.terms.some(function (x) { return x.topic === tp.id; })) out += '<option value="t:' + esc(tp.id) + '"' + (cur === "t:" + tp.id ? " selected" : "") + '>' + esc(tp.name) + '</option>';
      }); });
      out += "</optgroup>";
    });
    return out;
  }
  function friendFormHtml() {
    var kind = fv("ff-kind", "q"), pace = fv("ff-pace", "host");
    return '<section class="section stack lvf"><h2>Practice with friends</h2><p class="hint">Start a room, share the code, and play together on your phones. You play too. Needs at least 2 players.</p>' +
      '<div class="field"><label class="label" for="ff-name">Name</label><input type="text" id="ff-name" maxlength="60" value="' + esc(fv("ff-name", "")) + '" placeholder="Study round"></div>' +
      '<div class="field"><label class="label" for="ff-kind">Round type</label><select id="ff-kind"><option value="q"' + (kind === "q" ? " selected" : "") + '>Questions</option><option value="t"' + (kind === "t" ? " selected" : "") + '>Guess the term from clues</option></select></div>' +
      '<div class="field"><label class="label" for="ff-scope">Topic</label><select id="ff-scope">' + scopeOptions() + '</select></div>' +
      '<div class="field"><label class="label" for="ff-pace">Pace</label><select id="ff-pace"><option value="host"' + (pace === "host" ? " selected" : "") + '>I tap Next</option><option value="auto"' + (pace === "auto" ? " selected" : "") + '>Timers move on by themselves</option></select></div>' +
      '<div class="teamrow"><div class="field"><label class="label" for="ff-n">Rounds (3 to 20)</label><input type="number" id="ff-n" min="3" max="20" value="' + esc(fv("ff-n", "8")) + '"></div>' +
      '<div class="field"><label class="label" for="ff-sec">Seconds each (10 to 60)</label><input type="number" id="ff-sec" min="10" max="60" value="' + esc(fv("ff-sec", "20")) + '"></div></div>' +
      '<div class="row tight"><button class="btn primary" data-act="fcreate"' + (R.busy ? " disabled" : "") + '>Create room</button></div></section>';
  }
  function inviteUrl() { return location.origin + location.pathname + "?room=" + R.code + "#live"; }
  function friendHostHtml(s) {
    var b = R.busy ? " disabled" : "", ctl = "";
    if (s.status === "lobby") {
      return '<section class="lv"><p class="tag">Share this code or the invite link with your friends</p><div class="lvcode" aria-label="Room code">' + esc(R.code) + '</div>' +
        '<p class="tag">' + esc(s.name) + ' · ' + s.players + ' of ' + s.max_players + ' joined' + (s.players < 2 ? " · waiting for a friend" : "") + '</p>' +
        '<div class="row tight"><a class="btn" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent("Join my DxDrill study round. Code " + R.code + " " + inviteUrl()) + '">Send on WhatsApp</a><button class="btn ghost" data-act="copyinv">Copy invite link</button></div>' +
        '<div class="row tight"><button class="btn primary" data-act="start"' + (s.players < 2 || R.busy ? " disabled" : "") + '>Start (' + s.players + ' joined)</button><button class="btn ghost small" data-act="del">Close room</button></div></section>' +
        (R.confirm ? '<p class="note bad">Close this room? Everyone loses it.</p><div class="row tight"><button class="btn small primary" data-act="delyes">Yes, close it</button><button class="btn ghost small" data-act="delno">Keep</button></div>' : "");
    }
    if (s.pace !== "auto" && (s.status === "question" || s.status === "reveal")) {
      var last = Number(s.cur_idx) + 1 >= Number(s.n);
      ctl = '<div class="row tight"><button class="btn ' + (s.status === "reveal" ? "primary" : "ghost") + '" data-act="next"' + b + '>' + (s.status === "question" ? "Show the answer now" : last ? "Finish and show results" : "Next question") + '</button></div>';
    }
    return playerHtml(s) + ctl;
  }
  function homeHtml() {
    var out = '<section class="lv"><h3>Join a live quiz</h3><p class="tag">Type the code shown by the host.</p><input class="lvjoin" id="lj-code" type="text" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" value="' + esc(R.join) + '" aria-label="Room code">' +
      '<div class="row tight"><button class="btn primary" data-act="join"' + (R.busy ? " disabled" : "") + '>Join</button></div></section>';
    var last = DX.store.get("dx.room", null);
    if (last && last.code) out += '<div class="row tight"><button class="btn ghost small" data-act="back" data-id="' + last.id + '" data-code="' + esc(last.code) + '">Return to room ' + esc(last.code) + '</button></div>';
    if (admin()) out += createHtml();
    else if (DX.features && DX.features.on("friends")) out += friendFormHtml();
    return out;
  }
  function createHtml() {
    loadPools();
    var scopes = '<option value="">Everything</option>' + DX.curriculum.subjects.map(function (s) { return '<option value="' + esc(s.id) + '"' + (fv("lf-scope", "") === s.id ? " selected" : "") + '>' + esc(s.name) + '</option>'; }).join("");
    var pools = '<option value="">Whole bank</option>' + (R.bankPools || []).map(function (b) { return '<option value="' + esc(b.pool) + '"' + (fv("lf-pool", "") === b.pool ? " selected" : "") + '>' + esc(b.pool) + ' (' + b.questions + ')</option>'; }).join("");
    var src = fv("lf-src", "items"), pace = fv("lf-pace", "host"), type = fv("lf-type", "solo");
    return '<section class="section stack lvf"><h2>Host a room</h2>' +
      '<div class="field"><label class="label" for="lf-type">Room type</label><select id="lf-type"><option value="solo"' + (type === "solo" ? " selected" : "") + '>Everyone for themselves</option><option value="team"' + (type === "team" ? " selected" : "") + '>Teams, with you as quizmaster</option></select></div>' +
      (type === "team" ? '<div class="teamrow"><div class="field"><label class="label" for="lf-teams">Teams (2 to 6)</label><input type="number" id="lf-teams" min="2" max="6" value="' + esc(fv("lf-teams", "3")) + '"></div><div class="field"><label class="label" for="lf-nd">Describe-it rounds (0 to 8)</label><input type="number" id="lf-nd" min="0" max="8" value="' + esc(fv("lf-nd", "2")) + '"></div></div><p class="hint">Players pick a team. A team scores the average quiz points per member, plus describe points. Each describe-it round gives every team its own term and one member describes it without the forbidden words. Terms come from the subject you choose (only terms that have forbidden words are used).</p>' : "") +
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
    var now = performance.now(), mode = hostOnly(s) ? "all" : "live", fx = DX.fx, toStart = R.startAt - now;
    if (toStart > 0) {
      var n = Math.ceil(toStart / 1000), el = document.getElementById("lv-ready");
      if (el) el.textContent = n;
      if (n !== R.lastN) { R.lastN = n; if (fx) { fx.add(el, "fx-beat"); fx.play("ready", mode); } }
      R.inLead = true; return;
    }
    if (R.inLead) { R.inLead = false; R.lastN = 0; R.lastTick = -1; R.sig = ""; if (fx) fx.play("go", mode); repaint(); return; }
    var left = shown(s), t = document.getElementById("lv-t"), bar = document.getElementById("lv-b");
    if (t) t.textContent = Math.ceil(left) + "s";
    if (bar) { bar.firstChild.style.width = Math.min(100, left * 100 / s.sec) + "%"; bar.className = "lvbar" + (left < 6 ? " low" : ""); }
    var c = Math.ceil(left);
    if (c <= 3 && c > 0 && c !== R.lastTick) { R.lastTick = c; if (fx && !hostOnly(s) && s.my_choice == null) fx.play("tick", mode); }
  }
  function inviteCode() { try { var m = /[?&]room=([A-Za-z0-9]{5})/.exec(location.search); return m ? m[1].toUpperCase() : ""; } catch (e) { return ""; } }
  function render(a) {
    app = a; var c = C();
    if (!c || !c.ok) { a.innerHTML = '<div class="wrap stack"><h1>Live quiz</h1><p class="lede">Live quizzes could not load. Check your connection and refresh.</p></div>'; return; }
    if (!c.user) { a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Live quiz</p><h1>Sign in to join</h1><p class="lede">Live quizzes run on your phone with a code from the host.</p></header><a class="btn primary" href="#account">Sign in</a>' + toolsHtml() + '</div>'; return; }
    var inv = inviteCode();
    if (inv && !R.id && !R.busy && !R.tried) { R.tried = true; R.join = inv; try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { } join(); return; }
    var note = R.err ? '<p class="note bad" role="alert">' + esc(R.err) + '</p>' : "", body, head = "";
    if (R.id && R.st) body = (hostOnly(R.st) ? hostHtml(R.st) : R.st.is_host ? friendHostHtml(R.st) : playerHtml(R.st)) + screenRow(R.st) + exitRow(R.st);
    else if (R.id) body = '<p class="muted">Joining…</p>';
    else { head = '<header><p class="eyebrow">Live quiz</p><h1>Join a live quiz</h1><p class="lede">Join with a code and race your classmates. Right answers count more the faster you are.</p></header>'; body = homeHtml() + toolsHtml(); }
    a.innerHTML = '<div class="wrap stack">' + head + note + body + toggles() + '</div>';
    ["lf-name", "lf-n", "lf-sec", "lf-teams", "lf-nd", "ff-name", "ff-n", "ff-sec"].forEach(function (id) { var el = document.getElementById(id); if (el && R.form[id] !== undefined) el.value = R.form[id]; });
    var s0 = R.st;
    if (s0 && (s0.status === "reveal" || s0.status === "finished") && DX.fx) {
      var sc = document.getElementById("lv-score");
      if (sc) { var to = Number(sc.getAttribute("data-to")); DX.fx.countUp(sc, R.shownScore, to); R.shownScore = to; }
      if (!hostOnly(s0) && R.fxIdx !== s0.cur_idx + ":" + s0.status) {
        R.fxIdx = s0.cur_idx + ":" + s0.status;
        var h = a.querySelector(".lv h3"); if (s0.status === "reveal") DX.fx.add(h, s0.my_choice === s0.right_answer ? "fx-pop" : "fx-shake");
        else DX.fx.add(h, "fx-pop");
      }
    }
    if (R.id && !R.poll && !R.fetching) schedule();
    if (R.id && !R.tick) R.tick = setInterval(tickNow, 250);
    if (!R.id && R.tick) { clearInterval(R.tick); R.tick = null; }
    tickNow();
  }
  function toggles() {
    if (!DX.fx) return "";
    return '<div class="row tight" style="margin-top:6px"><button class="chip toggle" data-act="lsound" aria-pressed="' + DX.fx.liveSound() + '">Live sounds on this device: ' + (DX.fx.liveSound() ? "on" : "off") + '</button>' +
      '<button class="chip toggle" data-act="lfx" aria-pressed="' + DX.fx.on() + '">Effects: ' + (DX.fx.on() ? "on" : "off") + '</button></div>' +
      (DX.fx.liveSound() && !DX.sound ? '<p class="hint">The Sound button at the top is off, so nothing will play.</p>' : "");
  }
  function onInput(e) {
    var id = e.target && e.target.id; if (!id) return;
    if (id === "lj-code") R.join = e.target.value.toUpperCase();
    else if (/^(lf|ff)-/.test(id)) R.form[id] = e.target.value;
  }
  function onKey(e) {
    if (e.target && e.target.id === "lj-code" && e.key === "Enter") { join(); return; }
    if (!R.st || R.st.status !== "question" || hostOnly(R.st) || (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
    var i = "abcd".indexOf(e.key.toLowerCase()); if (i < 0) i = ["1", "2", "3", "4"].indexOf(e.key);
    if (i >= 0) answer(i);
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!t) return;
    var a = t.getAttribute("data-act");
    if (DX.fx && DX.fx.unlock) DX.fx.unlock();   /* browsers only allow sound after a tap */
    if (a === "lsound") { DX.fx.toggleLiveSound(); repaint(); return; }
    if (a === "lfx") { DX.fx.toggle(); repaint(); return; }
    if (a === "scrcopy") {
      var u = location.origin + location.pathname + "#screen?c=" + R.code;
      if (navigator.share) navigator.share({ url: u, title: "DxDrill big screen" }).catch(function () { });
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { R.scrNote = "Link copied."; repaint(); }, function () { R.scrNote = u; repaint(); });
      else { R.scrNote = u; repaint(); }
      return;
    }
    if (a === "join") join();
    else if (a === "fcreate") friendCreate();
    else if (a === "team") act("room_set_team", { p_room: R.id, p_team: parseInt(t.getAttribute("data-t"), 10) }, fetchState);
    else if (a === "descdone") { R.descDone = R.st.cur_idx; act("room_describe_done", { p_room: R.id, p_idx: R.st.cur_idx }, fetchState); }
    else if (a === "void") act("room_void_team", { p_room: R.id, p_idx: R.st.cur_idx, p_team: parseInt(t.getAttribute("data-team"), 10) }, fetchState);
    else if (a === "copyinv") { var u = inviteUrl(); try { navigator.clipboard.writeText(u).then(function () { R.err = ""; t.textContent = "Copied"; }, function () { t.textContent = u; }); } catch (er) { t.textContent = u; } }
    else if (a === "pick") answer(parseInt(t.getAttribute("data-i"), 10));
    else if (a === "create") create();
    else if (a === "back") enter(parseInt(t.getAttribute("data-id"), 10), t.getAttribute("data-code"));
    else if (a === "start") act("room_start", { p_room: R.id }, fetchState);
    else if (a === "next") act("room_next", { p_room: R.id }, fetchState);
    else if (a === "del") { R.confirm = true; repaint(); }
    else if (a === "delno") { R.confirm = false; repaint(); }
    else if (a === "delyes") { var id = R.id; R.confirm = false; act("admin_delete_room", { p_room: id }, function () { stop(); R.id = 0; R.st = null; remember(); repaint(); }); }
    else if (a === "leaveroom") { var keep = R.st && R.st.status !== "finished", kid = R.id, kcode = R.code; stop(); R.id = 0; R.st = null; R.err = ""; if (keep) DX.store.set("dx.room", { id: kid, code: kcode }); else remember(); repaint(); }
    else if (a === "change") { R.form["lf-src"] = document.getElementById("lf-src").value; repaint(); }
  }
  /* The source and pace selects change what the form shows. */
  document.addEventListener("change", function (e) {
    if ((location.hash || "") === "#live" && e.target && (e.target.id === "lf-src" || e.target.id === "lf-type")) { R.form[e.target.id] = e.target.value; repaint(); }
  });
})();
