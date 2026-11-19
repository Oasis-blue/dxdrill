/* Fun polls: students vote and see how the class splits. The admin creates polls; students can suggest them. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var P = { loaded: false, loading: false, polls: [], mine: {}, res: {}, sugg: [], error: "", down: false, msg: "", err: "", busy: false,
            form: { q: "", opts: "", closes: "", change: true }, suggText: "", confirm: null, showForm: false };
  DX.polls = { render: render, onClick: onClick, onInput: onInput, leave: function () { P.loaded = false; P.loading = false; P.confirm = null; } };

  var css = document.createElement("style");
  css.textContent =
    ".poll{background:var(--surface);border:1.5px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}" +
    ".poll h3{font-size:18px;overflow-wrap:anywhere}" +
    ".poll .tag{font-size:13px;color:var(--muted)}" +
    ".popt{position:relative;display:block;width:100%;text-align:left;border:1.5px solid var(--line);background:var(--bg);border-radius:10px;padding:10px 12px;overflow:hidden;min-height:46px}" +
    ".popt:disabled{cursor:default;opacity:1}" +
    ".popt .fill{position:absolute;left:0;top:0;bottom:0;background:var(--surface2);z-index:0}" +
    ".popt.mine{border-color:var(--accent)}" +
    ".popt.mine .fill{background:color-mix(in srgb,var(--accent) 22%,var(--bg))}" +
    ".popt .row1{position:relative;z-index:1;display:flex;justify-content:space-between;gap:10px;align-items:baseline}" +
    ".popt .lbl{font-weight:600;overflow-wrap:anywhere;min-width:0}" +
    ".popt .pct{font-family:var(--font-display);font-weight:700;font-variant-numeric:tabular-nums}" +
    ".popt .sub{position:relative;z-index:1;font-size:13px;color:var(--muted)}" +
    ".pollform textarea{width:100%;min-height:90px;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);resize:vertical}" +
    ".pollform input[type=text],.pollform input[type=date]{width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg)}";
  document.head.appendChild(css);

  function C() { return DX.cloud; }
  function admin() { return !!(C().profile && C().profile.is_admin); }
  function closedNow(p) { return !!p.is_closed || (p.closes_at && new Date(p.closes_at).getTime() <= Date.now()); }
  function myClass() { var id = C().profile && C().profile.class_id, k = DX.curriculum.classes.filter(function (x) { return x.id === id; })[0]; return k ? k.label : ""; }
  function fail(e, fallback) {
    var m = (e && e.message) || "";
    if (C().isDown(e)) return "DxDrill’s online part is not answering. It may be waking up, so try again in a minute.";
    if (/already voted/i.test(m)) return "You already voted in this poll.";
    if (/poll closed/i.test(m)) return "This poll has closed.";
    if (/2 to 5 options/i.test(m)) return "A poll needs 2 to 5 options.";
    if (/daily limit/i.test(m)) return "That is enough for today. Try again tomorrow.";
    if (/schema cache|does not exist|cast_vote|poll_results|relation/i.test(m)) return "Polls are not switched on yet. Run supabase/update-3.sql in Supabase.";
    return fallback;
  }

  function load() {
    var sb = C().sb; P.error = ""; P.down = false;
    Promise.all([
      sb.from("polls").select("id,question,allow_change,closes_at,is_closed,created_at,poll_options(id,label,position)").order("created_at", { ascending: false }).limit(30),
      sb.from("poll_votes").select("poll_id,option_id"),
      admin() ? sb.from("poll_suggestions").select("id,text,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] })
    ]).then(function (r) {
      if (r[0].error || r[1].error) throw (r[0].error || r[1].error);
      P.polls = (r[0].data || []).map(function (p) { p.poll_options = (p.poll_options || []).slice().sort(function (a, b) { return a.position - b.position; }); return p; });
      P.mine = {}; (r[1].data || []).forEach(function (v) { P.mine[v.poll_id] = v.option_id; });
      P.sugg = (r[2] && r[2].data) || [];
      return loadResults();
    }).then(function () { P.loaded = true; P.loading = false; repaint(); })
      .catch(function (e) { P.error = fail(e, "Could not load the polls."); P.down = C().isDown(e); P.loaded = true; P.loading = false; repaint(); });
  }
  function loadResults() {
    var ids = P.polls.map(function (p) { return p.id; });
    if (!ids.length) { P.res = {}; return Promise.resolve(); }
    return C().sb.rpc("poll_results", { p_poll_ids: ids }).then(function (r) {
      if (r.error) throw r.error;
      var by = {}; (r.data || []).forEach(function (x) { (by[x.poll_id] = by[x.poll_id] || {})[x.option_id] = x; });
      P.res = by;
    });
  }
  function repaint() { if ((location.hash || "") === "#polls" && app) render(app); }
  function act(p, ok) {
    P.busy = true; P.err = ""; P.msg = ""; repaint();
    p.then(function (r) { if (r && r.error) throw r.error; return ok ? ok(r) : null; })
      .then(function () { P.busy = false; repaint(); })
      .catch(function (e) { P.busy = false; P.err = fail(e, "That did not work. Try again."); repaint(); });
  }

  function pollHtml(p) {
    var closed = closedNow(p), voted = P.mine[p.id], res = P.res[p.id], showRes = !!res, total = 0, ct = 0;
    if (res) p.poll_options.forEach(function (o) { var x = res[o.id]; if (x) { total += Number(x.votes); ct += Number(x.class_votes); } });
    var cls = myClass();
    var tag = closed ? "Closed" : (p.closes_at ? "Closes " + new Date(p.closes_at).toDateString().slice(4, 10) : "Open") + (p.allow_change ? "" : " · one vote only");
    var canVote = C().user && !closed && !(voted && !p.allow_change);
    var opts = p.poll_options.map(function (o) {
      var x = res && res[o.id], n = x ? Number(x.votes) : 0, pct = total ? Math.round(n * 100 / total) : 0;
      var cpct = ct ? Math.round(Number(x ? x.class_votes : 0) * 100 / ct) : 0;
      var inner = showRes ?
        '<span class="fill" style="width:' + pct + '%"></span><span class="row1"><span class="lbl">' + esc(o.label) + '</span><span class="pct">' + pct + '%</span></span>' +
        '<span class="sub">' + n + ' vote' + (n === 1 ? "" : "s") + (ct && cls ? " · " + esc(cls) + " " + cpct + "%" : "") + '</span>' :
        '<span class="row1"><span class="lbl">' + esc(o.label) + '</span></span>';
      return '<button class="popt' + (voted === o.id ? " mine" : "") + '" data-act="vote" data-poll="' + p.id + '" data-opt="' + o.id + '"' + (canVote && !P.busy ? "" : " disabled") + '>' + inner + '</button>';
    }).join("");
    var foot = showRes ? '<p class="tag">' + total + ' vote' + (total === 1 ? "" : "s") + (voted && canVote ? " · tap another option to change your vote" : "") + '</p>' : (C().user ? "" : '<p class="tag">Sign in to vote.</p>');
    var adm = !admin() ? "" : '<div class="row tight">' +
      '<button class="btn ghost small" data-act="pclose" data-poll="' + p.id + '" data-v="' + (closed ? "0" : "1") + '">' + (closed ? "Reopen" : "Close poll") + '</button>' +
      '<button class="btn ghost small" data-act="pdel" data-poll="' + p.id + '">Delete</button></div>' +
      (P.confirm === p.id ? '<p class="note bad">Delete this poll and all its votes? This cannot be undone.</p><div class="row tight"><button class="btn small primary" data-act="pdelyes" data-poll="' + p.id + '">Yes, delete</button><button class="btn ghost small" data-act="pno">Cancel</button></div>' : "");
    return '<article class="poll"><p class="tag">' + esc(tag) + '</p><h3>' + esc(p.question) + '</h3>' + opts + foot + adm + '</article>';
  }

  function adminForm() {
    var f = P.form;
    if (!P.showForm) return '<div class="row tight"><button class="btn primary small" data-act="newpoll">New poll</button></div>';
    return '<section class="section stack pollform"><h2>New poll</h2>' +
      '<div class="field"><label class="label" for="pf-q">Question</label><input type="text" id="pf-q" maxlength="200" value="' + esc(f.q) + '"></div>' +
      '<div class="field"><label class="label" for="pf-o">Options, one per line (2 to 5)</label><textarea id="pf-o" maxlength="500">' + esc(f.opts) + '</textarea></div>' +
      '<div class="field"><label class="label" for="pf-d">Closes on (optional)</label><input type="date" id="pf-d" value="' + esc(f.closes) + '"></div>' +
      '<label class="checkline"><input type="checkbox" id="pf-c"' + (f.change ? " checked" : "") + '><span>Students can change their vote</span></label>' +
      '<div class="row tight"><button class="btn primary" data-act="pcreate"' + (P.busy ? " disabled" : "") + '>Publish poll</button><button class="btn ghost" data-act="pcancel">Cancel</button></div></section>';
  }
  function suggestionsHtml() {
    var mine = '<section class="section stack pollform"><h2>Suggest a poll</h2><p class="hint">Got a fun question for the class? Send it and the admin may turn it into a poll.</p>' +
      '<div class="field"><label class="label" for="sg-t">Your idea</label><input type="text" id="sg-t" maxlength="200" value="' + esc(P.suggText) + '" placeholder="Night owls or early birds?"></div>' +
      '<div class="row tight"><button class="btn small" data-act="sgsend"' + (P.busy ? " disabled" : "") + '>Send idea</button></div></section>';
    if (!admin() || !P.sugg.length) return mine;
    return mine + '<section class="section stack"><h2>Admin: suggested polls</h2>' + P.sugg.map(function (s) {
      return '<div class="rep-item"><p class="q">' + esc(s.text) + '</p><div class="row tight"><button class="btn small" data-act="sguse" data-id="' + s.id + '">Use it</button><button class="btn ghost small" data-act="sgno" data-id="' + s.id + '">Dismiss</button></div></div>';
    }).join("") + '</section>';
  }

  function render(a) {
    app = a;
    var c = C();
    if (!c || !c.ok) { a.innerHTML = '<div class="wrap stack"><h1>Polls</h1><p class="lede">Polls could not load. Check your connection and refresh.</p></div>'; return; }
    if (!c.user) { a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Polls</p><h1>Sign in to join the polls</h1><p class="lede">Light questions, just for fun. Vote and see how the class splits.</p></header><a class="btn primary" href="#account" style="text-decoration:none;align-self:flex-start">Sign in or create an account</a></div>'; return; }
    var body;
    if (!P.loaded) { body = '<p class="muted">Loading…</p>'; if (!P.loading) { P.loading = true; load(); } }
    else if (P.error) body = '<p class="note bad">' + esc(P.error) + '</p>' + (P.down ? '<div class="row tight"><button class="btn small" data-act="pretry">Try again</button></div>' : "");
    else body = (P.polls.length ? P.polls.map(pollHtml).join("") : '<p class="muted">No polls yet.</p>');
    a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Polls</p><h1>How does the class split?</h1><p class="lede">Light questions, just for fun. Not for studying.</p></header>' +
      (P.err ? '<p class="note bad" role="alert">' + esc(P.err) + '</p>' : "") + (P.msg ? '<p class="note">' + esc(P.msg) + '</p>' : "") +
      (admin() ? adminForm() : "") + body + (P.loaded && !P.error ? suggestionsHtml() : "") + '</div>';
  }

  function onInput(e) {
    var id = e.target.id;
    if (id === "pf-q") P.form.q = e.target.value; else if (id === "pf-o") P.form.opts = e.target.value;
    else if (id === "pf-d") P.form.closes = e.target.value; else if (id === "pf-c") P.form.change = e.target.checked;
    else if (id === "sg-t") P.suggText = e.target.value;
  }
  function onClick(e) {
    var b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
    var a = b.getAttribute("data-act"), sb = C().sb, poll = parseInt(b.getAttribute("data-poll"), 10);
    if (a === "vote") {
      var opt = parseInt(b.getAttribute("data-opt"), 10);
      if (P.mine[poll] === opt) return;
      act(sb.rpc("cast_vote", { p_poll: poll, p_option: opt }), function () { P.mine[poll] = opt; return loadResults(); });
    } else if (a === "pretry") { P.loaded = false; P.loading = false; repaint();
    } else if (a === "newpoll") { P.showForm = true; repaint();
    } else if (a === "pcancel") { P.showForm = false; repaint();
    } else if (a === "pcreate") {
      var f = P.form, opts = f.opts.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
      if (f.q.trim().length < 3) { P.err = "Write the question first."; return repaint(); }
      if (opts.length < 2 || opts.length > 5) { P.err = "Give 2 to 5 options, one per line."; return repaint(); }
      var closes = f.closes ? new Date(f.closes + "T23:59:00").toISOString() : null;
      act(sb.rpc("admin_create_poll", { p_question: f.q.trim(), p_options: opts, p_closes: closes, p_allow_change: !!f.change }), function () {
        P.form = { q: "", opts: "", closes: "", change: true }; P.showForm = false; P.msg = "Poll published."; P.loaded = false; P.loading = false;
      });
    } else if (a === "pclose") {
      act(sb.rpc("admin_set_poll_closed", { p_id: poll, p_closed: b.getAttribute("data-v") === "1" }), function () { P.loaded = false; P.loading = false; });
    } else if (a === "pdel") { P.confirm = poll; repaint();
    } else if (a === "pno") { P.confirm = null; repaint();
    } else if (a === "pdelyes") {
      P.confirm = null;
      act(sb.rpc("admin_delete_poll", { p_id: poll }), function () { P.polls = P.polls.filter(function (x) { return x.id !== poll; }); P.msg = "Poll deleted."; });
    } else if (a === "sgsend") {
      var t = P.suggText.trim();
      if (t.length < 5) { P.err = "Write your idea in a few words."; return repaint(); }
      act(sb.from("poll_suggestions").insert({ text: t }), function () { P.suggText = ""; P.msg = "Thanks. The admin will take a look."; });
    } else if (a === "sguse") {
      var id = b.getAttribute("data-id"), s = P.sugg.filter(function (x) { return String(x.id) === id; })[0];
      if (s) { P.form.q = s.text; P.showForm = true; }
      act(sb.from("poll_suggestions").update({ status: "used" }).eq("id", id), function () { P.sugg = P.sugg.filter(function (x) { return String(x.id) !== id; }); window.scrollTo(0, 0); });
    } else if (a === "sgno") {
      var id2 = b.getAttribute("data-id");
      act(sb.from("poll_suggestions").update({ status: "dismissed" }).eq("id", id2), function () { P.sugg = P.sugg.filter(function (x) { return String(x.id) !== id2; }); });
    }
  }
})();
