/* Debates: one claim, take a side with an optional short reason, react to other people's reasons. The admin posts and moderates. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var D = { view: "list", list: null, sugg: null, id: 0, info: null, takes: null, tab: "", side: "", reason: "", editing: false, err: "", busy: false,
            claim: DX.store.get("dx.debate.claim", ""), context: "", suggText: "", suggSent: false, confirm: "" };
  DX.debates = { render: render, onClick: onClick, onInput: onInput, leave: function () { } };
  var KINDS = [["good", "👍", "Good point"], ["new", "💡", "New to me"], ["unsure", "🤔", "Not sure"]];

  function C() { return DX.cloud; }
  function admin() { return !!(C() && C().profile && C().profile.is_admin); }
  function repaint() { if ((location.hash || "") === "#debates" && app) render(app); }
  function fail(e) {
    var m = (e && e.message) || "";
    if (C().isDown(e)) return "DxDrill’s online part is not answering. Try again in a minute.";
    if (/debate closed/i.test(m)) return "This debate is closed.";
    if (/take a side first/i.test(m)) return "Take a side first to see and react to other people’s reasons.";
    if (/too many today/i.test(m)) return "You have sent 5 suggestions today. Try again tomorrow.";
    if (/too short/i.test(m)) return "Write a little more (at least 5 characters).";
    if (/schema cache|does not exist|debate_/i.test(m)) return "Debates are not switched on yet. Run supabase/update-8.sql in Supabase.";
    if (/not your own/i.test(m)) return "You cannot react to your own reason.";
    return "That did not work. Try again.";
  }
  function call(rpc, args, ok) {
    D.busy = true; D.err = ""; repaint();
    return C().sb.rpc(rpc, args).then(function (r) { if (r.error) throw r.error; D.busy = false; if (ok) ok(r); else repaint(); })
      .catch(function (e) { D.busy = false; D.err = fail(e); repaint(); });
  }
  function loadList() {
    C().sb.rpc("debate_list").then(function (r) { if (r.error) throw r.error; D.list = r.data || []; repaint(); })
      .catch(function (e) { D.list = []; D.err = fail(e); repaint(); });
    if (admin()) C().sb.rpc("admin_debate_suggestions").then(function (r) { if (!r.error) { D.sugg = r.data || []; repaint(); } });
  }
  function loadDebate(keepTab) {
    var id = D.id;
    C().sb.rpc("debate_info", { p_id: id }).then(function (r) {
      if (r.error) throw r.error; var i = r.data && r.data[0]; if (!i) throw new Error("not found"); D.info = i;
      if (i.my_side || i.closed || admin()) return C().sb.rpc("debate_takes", { p_id: id, p_side: D.tab || null, p_limit: 60 }).then(function (t) { if (t.error) throw t.error; D.takes = t.data || []; repaint(); });
      D.takes = []; repaint();
    }).catch(function (e) { D.err = fail(e); repaint(); });
  }
  function open(id) { D.view = "detail"; D.id = id; D.info = null; D.takes = null; D.tab = ""; D.side = ""; D.reason = ""; D.editing = false; D.err = ""; D.confirm = ""; repaint(); loadDebate(); }

  function listHtml() {
    var out = "";
    if (admin()) {
      out += '<section class="section stack"><h2>Post a debate (admin)</h2><div class="field"><label class="label" for="db-claim">Claim</label><input type="text" id="db-claim" maxlength="200" value="' + esc(D.claim) + '" placeholder="e.g. Doctors should always tell patients the full truth"></div>' +
        '<div class="field"><label class="label" for="db-context">Context (optional)</label><textarea id="db-context" rows="3" maxlength="600" style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);font:inherit">' + esc(D.context) + '</textarea></div>' +
        '<div class="row tight"><button class="btn primary" data-act="post"' + (D.busy ? " disabled" : "") + '>Post debate</button></div></section>';
    }
    if (D.list === null) { D.list = []; loadList(); out += '<p class="muted">Loading…</p>'; }
    else if (!D.list.length) out += '<p class="muted">No debates yet.' + (admin() ? "" : " Suggest a topic below.") + '</p>';
    else out += '<section class="stack">' + D.list.map(function (d) {
      return '<article class="card"><h2 style="overflow-wrap:anywhere">' + esc(d.claim) + '</h2><p>' + d.takes + ' take' + (d.takes === 1 ? "" : "s") + (d.closed ? " · closed" : "") + (d.my_side ? " · you " + d.my_side + "d" : "") + '</p><button class="btn' + (d.my_side ? "" : " primary") + '" data-act="open" data-id="' + d.id + '">' + (d.closed ? "See the result" : d.my_side ? "Open" : "Take a side") + '</button></article>';
    }).join("") + '</section>';
    out += '<section class="section stack"><h2>Suggest a topic</h2>' + (D.suggSent ? '<p class="note" role="status">Thank you. Your suggestion was sent.</p>' :
      '<div class="field"><label class="label" for="db-sugg">What should we debate?</label><input type="text" id="db-sugg" maxlength="200" value="' + esc(D.suggText) + '" placeholder="A claim people can agree or disagree with"></div><div class="row tight"><button class="btn" data-act="suggest"' + (D.busy ? " disabled" : "") + '>Send suggestion</button></div>') + '</section>';
    if (admin() && D.sugg && D.sugg.length) out += '<section class="section stack"><h2>Suggestions (admin)</h2>' + D.sugg.map(function (s) {
      return '<article class="card"><p class="muted" style="font-size:13px">' + esc(s.display_name || "?") + ' · ' + esc(new Date(s.created_at).toLocaleDateString()) + '</p><p style="overflow-wrap:anywhere">' + esc(s.topic) + '</p><div class="row tight"><button class="btn small" data-act="usesugg" data-id="' + s.id + '">Use as claim</button><button class="btn ghost small" data-act="delsugg" data-id="' + s.id + '">Delete</button></div></article>';
    }).join("") + '</section>';
    return out;
  }
  function stanceForm(i) {
    var side = D.side || i.my_side || "";
    return '<section class="card" style="gap:12px"><h3>' + (i.my_side ? "Change your take" : "Where do you stand?") + '</h3><div class="fcrate" role="group" aria-label="Your side">' +
      ["agree", "disagree"].map(function (s) { return '<button class="btn' + (side === s ? " primary" : "") + '" data-act="side" data-side="' + s + '" aria-pressed="' + (side === s) + '">' + (s === "agree" ? "Agree" : "Disagree") + '</button>'; }).join("") + '</div>' +
      '<div class="field"><label class="label" for="db-reason">Why? (optional, short)</label><textarea id="db-reason" rows="3" maxlength="300" style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);font:inherit">' + esc(D.reason !== "" || D.touched ? D.reason : (i.my_reason || "")) + '</textarea><p class="hint">Be kind and keep it about the idea. Up to 300 characters. Your name and class show next to it.</p></div>' +
      '<div class="row tight"><button class="btn primary" data-act="take"' + (!side || D.busy ? " disabled" : "") + '>' + (i.my_side ? "Save my take" : "Post my take") + '</button>' + (D.editing ? '<button class="btn ghost" data-act="canceledit">Cancel</button>' : "") + '</div></section>';
  }
  function splitHtml(i) {
    var a = Number(i.n_agree) || 0, d = Number(i.n_disagree) || 0, tot = a + d, pa = tot ? Math.round(a * 100 / tot) : 0;
    return '<section class="card"><div class="row tight" style="justify-content:space-between"><b>Agree ' + a + (tot ? " (" + pa + "%)" : "") + '</b><b>Disagree ' + d + (tot ? " (" + (100 - pa) + "%)" : "") + '</b></div><div aria-hidden="true" style="height:8px;border-radius:99px;background:var(--surface2);overflow:hidden"><i style="display:block;height:100%;background:var(--accent);width:' + pa + '%"></i></div></section>';
  }
  function takeHtml(t, closed) {
    var rx = KINDS.map(function (k) {
      var n = k[0] === "good" ? t.good : k[0] === "new" ? t.new_to_me : t.unsure, on = t.my_reaction === k[0];
      var can = !t.mine && !closed;
      return '<button class="chip toggle" ' + (can ? 'data-act="react" data-take="' + t.id + '" data-kind="' + k[0] + '"' : "disabled") + ' aria-pressed="' + on + '" title="' + k[2] + '">' + k[1] + " " + k[2] + (Number(n) ? " · " + n : "") + '</button>';
    }).join("");
    return '<article class="card" style="gap:8px"><p class="muted" style="font-size:13px"><b>' + (t.side === "agree" ? "Agrees" : "Disagrees") + '</b> · ' + esc(t.display_name) + (t.class_id ? " · " + esc(t.class_id) : "") + (t.mine ? " · you" : "") + (t.hidden ? " · hidden" : "") + '</p>' +
      '<p style="overflow-wrap:anywhere;white-space:pre-wrap">' + esc(t.reason) + '</p><div class="row tight" style="flex-wrap:wrap">' + rx +
      (admin() ? '<button class="btn ghost small" data-act="hide" data-take="' + t.id + '" data-hide="' + (t.hidden ? "0" : "1") + '">' + (t.hidden ? "Show again" : "Hide") + '</button>' : "") + '</div></article>';
  }
  function detailHtml() {
    var i = D.info; if (!i) return '<p class="muted">Loading…</p>';
    var out = '<button class="btn ghost small" data-act="back">← All debates</button><header><p class="eyebrow">' + (i.closed ? "Debate (closed)" : "Debate") + '</p><h1 style="overflow-wrap:anywhere">' + esc(i.claim) + '</h1>' + (i.context ? '<p class="lede" style="white-space:pre-wrap">' + esc(i.context) + '</p>' : "") + '</header>';
    if (!i.closed && (!i.my_side || D.editing)) out += stanceForm(i);
    else if (i.my_side) out += '<p class="note">You ' + i.my_side + 'd.' + (i.my_reason ? ' “' + esc(i.my_reason) + '”' : "") + '</p>' + (i.closed ? "" : '<div class="row tight"><button class="btn small" data-act="edit">Change my take</button></div>');
    if (i.n_agree !== null && i.n_agree !== undefined) out += splitHtml(i);
    if (D.takes) {
      out += '<div class="row tight" role="tablist">' + [["", "All"], ["agree", "Agree"], ["disagree", "Disagree"]].map(function (x) { return '<button class="chip toggle" data-act="tab" data-tab="' + x[0] + '" aria-pressed="' + (D.tab === x[0]) + '">' + x[1] + '</button>'; }).join("") + '<button class="btn ghost small" data-act="refresh">Refresh</button></div>';
      out += D.takes.length ? '<section class="stack">' + D.takes.map(function (t) { return takeHtml(t, i.closed); }).join("") + '</section>' : '<p class="muted">No written reasons here yet.</p>';
    } else if (!i.closed) out += '<p class="muted">Take a side to see the split and what others wrote.</p>';
    if (admin()) {
      out += '<section class="section stack"><h2>Admin</h2><div class="row tight"><button class="btn small" data-act="toggleclose">' + (i.closed ? "Reopen" : "Close debate") + '</button>' +
        (D.confirm === "del" ? '<button class="btn small primary" data-act="delyes">Yes, delete it</button><button class="btn ghost small" data-act="delno">Keep</button>' : '<button class="btn ghost small" data-act="del">Delete debate</button>') + '</div></section>';
    }
    return out;
  }
  function render(a) {
    app = a; var c = C();
    if (!c || !c.ok) { a.innerHTML = '<div class="wrap stack"><h1>Debates</h1><p class="lede">Debates could not load. Check your connection and refresh.</p></div>'; return; }
    if (!c.user) { a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Debates</p><h1>Sign in to join the debate</h1><p class="lede">Signing in lets you take a side and react.</p></header><a class="btn primary" href="#account" style="text-decoration:none">Sign in</a></div>'; return; }
    var head = D.view === "list" ? '<header><p class="eyebrow">Debates</p><h1>Where do you stand?</h1><p class="lede">Take a side on a claim, say why, and react to what others think.</p></header>' : "";
    a.innerHTML = '<div class="wrap stack">' + head + (D.err ? '<p class="note bad" role="alert">' + esc(D.err) + '</p>' : "") + (D.view === "list" ? listHtml() : detailHtml()) + '</div>';
  }
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === "db-claim") { D.claim = e.target.value; DX.store.set("dx.debate.claim", D.claim); }
    else if (id === "db-context") D.context = e.target.value;
    else if (id === "db-sugg") D.suggText = e.target.value;
    else if (id === "db-reason") { D.reason = e.target.value; D.touched = true; }
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null; if (!t) return;
    var a = t.getAttribute("data-act"), id = parseInt(t.getAttribute("data-id"), 10), take = parseInt(t.getAttribute("data-take"), 10);
    if (a === "open") open(id);
    else if (a === "back") { D.view = "list"; D.list = null; D.err = ""; repaint(); }
    else if (a === "side") { D.side = t.getAttribute("data-side"); repaint(); }
    else if (a === "edit") { D.editing = true; D.touched = false; D.reason = ""; D.side = ""; repaint(); }
    else if (a === "canceledit") { D.editing = false; repaint(); }
    else if (a === "take") {
      var side = D.side || (D.info && D.info.my_side), reason = (D.reason !== "" || D.touched) ? D.reason : ((D.info && D.info.my_reason) || "");
      call("debate_take", { p_id: D.id, p_side: side, p_reason: reason }, function () { D.editing = false; D.touched = false; D.reason = ""; D.side = ""; loadDebate(); });
    }
    else if (a === "tab") { D.tab = t.getAttribute("data-tab"); loadDebate(); }
    else if (a === "refresh") loadDebate();
    else if (a === "react") {
      var kind = t.getAttribute("data-kind"), cur = (D.takes || []).filter(function (x) { return x.id === take; })[0];
      call("debate_react", { p_take: take, p_kind: cur && cur.my_reaction === kind ? null : kind }, function () { D.busy = false; loadDebate(); });
    }
    else if (a === "post") call("admin_create_debate", { p_claim: D.claim, p_context: D.context }, function () { D.claim = ""; D.context = ""; DX.store.set("dx.debate.claim", ""); D.list = null; repaint(); });
    else if (a === "suggest") call("debate_suggest", { p_topic: D.suggText }, function () { D.suggText = ""; D.suggSent = true; repaint(); });
    else if (a === "usesugg") { var s = (D.sugg || []).filter(function (x) { return x.id === id; })[0]; if (s) { D.claim = s.topic; DX.store.set("dx.debate.claim", D.claim); repaint(); window.scrollTo(0, 0); } }
    else if (a === "delsugg") call("admin_delete_debate_suggestion", { p_id: id }, function () { D.sugg = null; D.list = null; repaint(); });
    else if (a === "hide") call("admin_hide_take", { p_take: take, p_hide: t.getAttribute("data-hide") === "1" }, function () { loadDebate(); });
    else if (a === "toggleclose") call("admin_set_debate_closed", { p_id: D.id, p_closed: !D.info.closed }, function () { loadDebate(); });
    else if (a === "del") { D.confirm = "del"; repaint(); }
    else if (a === "delno") { D.confirm = ""; repaint(); }
    else if (a === "delyes") call("admin_delete_debate", { p_id: D.id }, function () { D.view = "list"; D.list = null; D.confirm = ""; repaint(); });
  }
})();
