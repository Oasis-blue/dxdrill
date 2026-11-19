/* Accounts, class names and leaderboards through Supabase. If Supabase cannot be reached, the rest of DxDrill still works. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var CFG = {
    url: "https://dkullruinrnwjmhlxlpl.supabase.co",
    key: "sb_publishable_azxnKz5UEbn3yuZjyqTZWQ_oYaOs92Z"   /* publishable key: safe to be public */
  };
  var C = { sb: null, user: null, profile: null, ok: false, msg: "", err: "", busy: false, mode: "in", board: { days: 7, cls: "", loaded: false, students: [], classes: [], error: "" } };
  DX.cloud = C;

  function classLabel(id) {
    var c = DX.curriculum.classes.filter(function (x) { return x.id === id; })[0];
    return c ? c.label + (c.name ? " · " + c.name : "") : "";
  }
  function repaint() { var h = (location.hash || "").slice(1); if (h === "account" || h === "board") { var r = h === "account" ? DX.account : DX.board; r.render(app); } }
  /* The online part can be switched off (free projects pause when idle) or unreachable. Postgres/auth errors carry a code; a dead server does not. */
  var DOWN = "DxDrill’s online part is not answering. It may be waking up, so try again in a minute. Practice and Hall mode still work, and your scores are kept on this device until it is back.";
  C.isDown = function (e) {
    if (!e) return false;
    var m = String(e.message || e);
    return e.name === "AuthRetryableFetchError" || e.status === 0 || e.status >= 500 || (!e.code && !e.status && /fetch|network|timeout|json|unexpected|load failed/i.test(m));
  };
  function niceError(e) {
    if (C.isDown(e)) return DOWN;
    var m = (e && e.message) || "Something went wrong.";
    if (/Invalid login/i.test(m)) return "That email and password do not match.";
    if (/already registered|already been registered/i.test(m)) return "That email already has an account. Use Sign in.";
    if (/Password should/i.test(m)) return "Use a password of at least 6 characters.";
    if (/sync_question_ids|schema cache/i.test(m)) return "The database needs the latest update. Run supabase/update-1.sql in Supabase, then try again.";
    if (/not allowed/i.test(m)) return "Only the admin can do that.";
    if (/rate limit/i.test(m)) return "Too many attempts. Wait a few minutes and try again.";
    if (/fetch|network/i.test(m)) return "Could not reach the server. Check your connection.";
    return m;
  }

  function loadProfile() {
    if (!C.user) { C.profile = null; return Promise.resolve(); }
    return C.sb.from("profiles").select("display_name,class_id,is_admin").eq("id", C.user.id).maybeSingle().then(function (r) {
      C.down = C.isDown(r.error);
      C.profile = r.data || null;
    });
  }
  function loadClasses() {
    return C.sb.from("classes").select("id,name").then(function (r) {
      if (r.error || !r.data) return;
      r.data.forEach(function (row) {
        DX.curriculum.classes.forEach(function (k) { if (k.id === row.id) k.name = row.name || ""; });
      });
    });
  }

  C.init = function () {
    if (!window.supabase || !window.supabase.createClient) { C.msg = "offline"; return Promise.resolve(); }
    try {
      C.sb = window.supabase.createClient(CFG.url, CFG.key);
    } catch (e) { return Promise.resolve(); }
    C.ok = true;
    C.sb.auth.onAuthStateChange(function (ev, session) {
      C.user = session ? session.user : null;
      if (ev === "PASSWORD_RECOVERY") { C.mode = "reset"; C.err = ""; C.msg = ""; if ((location.hash || "") !== "#account") location.hash = "#account"; }
      loadProfile().then(function () { flush(); repaint(); });
    });
    return C.sb.auth.getSession().then(function (r) {
      C.user = r.data && r.data.session ? r.data.session.user : null;
      return Promise.all([loadProfile(), loadClasses()]);
    }).then(flush).catch(function () { C.down = true; /* offline is fine */ });
  };

  /* Scores: queued on the device and sent when signed in, so nothing is lost offline. */
  function queue() { return DX.store.get("dx.pending", []); }
  function flush() {
    if (!C.ok || !C.user) return Promise.resolve();
    var q = queue(); if (!q.length) return Promise.resolve();
    var batch = q.slice(0, 200);
    return C.sb.from("answers").insert(batch.map(function (x) { return { question_id: x.id, correct: x.ok }; })).then(function (r) {
      if (!r.error) DX.store.set("dx.pending", q.slice(batch.length));
      else if (/daily limit/i.test(r.error.message || "")) DX.store.set("dx.pending", []);   /* over the daily cap: do not retry forever */
    }).catch(function () { });
  }
  C.submit = function (items) {
    if (!C.ok) return;
    var q = queue().concat(items.map(function (x) { return { id: String(x.id), ok: !!x.ok }; })), seen = Object.create(null);
    q = q.filter(function (x) { var k = x.id + "|" + x.ok; if (seen[k]) return false; seen[k] = 1; return true; });   /* one row per question and result is enough for points */
    DX.store.set("dx.pending", q.slice(-500));
    flush();
  };

  /* ---------- question reports ---------- */
  C.reports = { loaded: false, rows: [], error: "" };
  C.canReport = function () { return C.ok && !!C.user; };
  /* Resolves to { ok: true } or { error: "message" }. A duplicate open report counts as success. */
  C.report = function (questionId, reason, note) {
    if (!C.canReport()) return Promise.resolve({ error: "Sign in to report a problem." });
    return C.sb.from("question_reports").insert({ question_id: String(questionId), reason: reason, note: (note || "").slice(0, 500) }).then(function (r) {
      if (r.error && r.error.code !== "23505") return { error: "Could not send the report. Try again in a moment." };
      return { ok: true };
    }).catch(function () { return { error: "Could not reach the server. Check your connection and try again." }; });
  };
  var REASONS = { wrong_answer: "Wrong answer", explanation: "Explanation is wrong", unclear: "Unclear question", typo: "Typo", other: "Other" };
  C.reasons = REASONS;
  function loadReports() {
    var R = C.reports; R.error = "";
    C.sb.from("question_reports").select("question_id,reason,note,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(500).then(function (r) {
      if (r.error) { R.error = "Could not load reports. If this is the first time, run the updated supabase/setup.sql."; R.rows = []; }
      else R.rows = r.data || [];
      R.loaded = true; repaint();
    }).catch(function () { R.error = "Could not reach the server."; R.loaded = true; repaint(); });
  }
  function reportsAdminHtml() {
    var R = C.reports;
    var head = '<section class="section stack"><h2>Admin: reported questions</h2><p class="hint">Open reports, most reported first. Fix the question in its JSON file, then mark it resolved.</p>';
    if (!R.loaded) return head + '<p class="muted">Loading…</p></section>';
    if (R.error) return head + '<p class="note bad">' + esc(R.error) + '</p></section>';
    if (!R.rows.length) return head + '<p class="muted">No open reports.</p></section>';
    var by = Object.create(null), order = [];
    R.rows.forEach(function (x) { if (!by[x.question_id]) { by[x.question_id] = []; order.push(x.question_id); } by[x.question_id].push(x); });
    order.sort(function (a, b) { return by[b].length - by[a].length; });
    return head + order.map(function (id) {
      var list = by[id], q = DX.questions.filter(function (x) { return x.id === id; })[0];
      var reasons = Object.create(null); list.forEach(function (x) { reasons[x.reason] = (reasons[x.reason] || 0) + 1; });
      var rs = Object.keys(reasons).map(function (k) { return (Object.prototype.hasOwnProperty.call(REASONS, k) ? REASONS[k] : k) + " ×" + reasons[k]; }).join(", ");
      var notes = list.filter(function (x) { return x.note; }).slice(0, 3).map(function (x) { return '<p class="why">“' + esc(x.note) + '”</p>'; }).join("");
      return '<div class="rep-item"><span class="label">' + esc(id) + ' · ' + list.length + ' report' + (list.length === 1 ? "" : "s") + '</span>' +
        '<p class="q">' + (q ? esc(q.q) : "Question no longer in the bank") + '</p>' +
        (q ? '<p class="why">Marked answer: ' + esc(q.options[q.answer]) + '</p>' : "") +
        '<p class="why">' + esc(rs) + '</p>' + notes +
        '<div class="row tight"><button class="btn small" data-act="rclose" data-id="' + esc(id) + '" data-v="resolved">Resolved</button>' +
        '<button class="btn ghost small" data-act="rclose" data-id="' + esc(id) + '" data-v="dismissed">Dismiss</button></div></div>';
    }).join("") + '</section>';
  }

  /* ---------- admin: members ---------- */
  C.members = { q: "", cls: "", rows: [], counts: [], loaded: false, error: "", confirm: null };
  function loadMembers() {
    var M = C.members; M.error = "";
    Promise.all([C.sb.rpc("admin_members", { p_search: M.q, p_class: M.cls || null, p_limit: 50 }), C.sb.rpc("admin_class_counts")]).then(function (r) {
      if (r[0].error) { M.error = /admin_members|schema cache/i.test(r[0].error.message || "") ? "Run supabase/update-2.sql in Supabase to turn this on." : "Could not load members."; M.rows = []; }
      else { M.rows = r[0].data || []; M.counts = (r[1] && r[1].data) || []; }
      M.loaded = true; M.loading = false; repaint();
    }).catch(function () { M.error = "Could not reach the server."; M.loaded = true; M.loading = false; repaint(); });
  }
  function membersAdminHtml() {
    var M = C.members, total = 0;
    M.counts.forEach(function (x) { total += Number(x.members) || 0; });
    var cc = M.counts.map(function (x) { return esc(x.class_id ? classLabel(x.class_id) || x.class_id : "No class") + " " + x.members; }).join(" · ");
    var head = '<section class="section stack"><h2>Admin: members</h2>' + (M.loaded && !M.error ? '<p class="hint">' + total + ' member' + (total === 1 ? "" : "s") + (cc ? " · " + cc : "") + '</p>' : "") +
      '<div class="teamrow"><div class="field"><label class="label" for="ms-q">Search name or email</label><input type="text" id="ms-q" value="' + esc(M.q) + '" maxlength="60"></div>' +
      '<div class="field"><label class="label" for="ms-class">Class</label><select id="ms-class"><option value="">All classes</option>' + DX.curriculum.classes.map(function (k) {
        return '<option value="' + k.id + '"' + (M.cls === k.id ? " selected" : "") + '>' + esc(k.label) + '</option>'; }).join("") + '</select></div>' +
      '<button class="btn small primary" data-act="msearch">Search</button></div>';
    if (!M.loaded) return head + '<p class="muted">Loading…</p></section>';
    if (M.error) return head + '<p class="note bad">' + esc(M.error) + '</p></section>';
    if (!M.rows.length) return head + '<p class="muted">Nobody matches.</p></section>';
    return head + '<p class="hint">Newest first, up to 50. Search to find someone.</p>' + M.rows.map(function (m) {
      var id = esc(m.user_id), cf = M.confirm && M.confirm.id === m.user_id ? M.confirm.kind : "";
      var joined = m.joined ? String(m.joined).slice(0, 10) : "";
      var acts = m.is_admin ? '<span class="muted">Admin account</span>' :
        '<button class="btn small" data-act="msave" data-id="' + id + '">Save</button>' +
        '<button class="btn ghost small" data-act="mask" data-kind="clear" data-id="' + id + '">Reset points</button>' +
        '<button class="btn ghost small" data-act="mask" data-kind="remove" data-id="' + id + '">Remove</button>';
      var box = !cf ? "" : '<p class="note bad">' + (cf === "remove" ? "Remove " + esc(m.display_name) + " and everything they have scored? This cannot be undone." : "Delete all of " + esc(m.display_name) + "’s scores? This cannot be undone.") + '</p>' +
        '<div class="row tight"><button class="btn small primary" data-act="myes" data-kind="' + cf + '" data-id="' + id + '">Yes, ' + (cf === "remove" ? "remove" : "reset") + '</button><button class="btn ghost small" data-act="mno">Cancel</button></div>';
      return '<div class="rep-item"><span class="label">' + esc(m.email || "") + ' · joined ' + esc(joined) + ' · ' + Number(m.points) + ' points · ' + Number(m.answers_total) + ' answers</span>' +
        '<div class="teamrow"><div class="field"><input type="text" id="mn-' + id + '" value="' + esc(m.display_name) + '" maxlength="40" aria-label="Name"></div>' +
        '<div class="field">' + classSelect("mc-" + id, m.class_id || "") + '</div></div>' +
        '<div class="row tight">' + acts + '</div>' + box + '</div>';
    }).join("") + '</section>';
  }
  function memberRow(id) { return C.members.rows.filter(function (x) { return x.user_id === id; })[0]; }

  /* ---------- account page ---------- */
  function classSelect(id, sel) {
    return '<select id="' + id + '"><option value="">Choose your class</option>' + DX.curriculum.classes.map(function (c) {
      return '<option value="' + c.id + '"' + (sel === c.id ? " selected" : "") + '>' + esc(c.label + (c.name ? " · " + c.name : "") + " · " + c.level) + '</option>';
    }).join("") + '</select>';
  }
  function accountView() {
    var note = (C.err ? '<p class="note bad" role="alert">' + esc(C.err) + '</p>' : "") + (C.msg && C.msg !== "offline" ? '<p class="note">' + esc(C.msg) + '</p>' : "");
    if (C.ok && C.user && C.mode === "reset") {
      return '<div class="wrap stack"><header><p class="eyebrow">Account</p><h1>Choose a new password</h1><p class="lede">You opened the reset link from your email. Pick a new password for your account.</p></header>' + note +
        '<section class="section stack"><div class="field"><label class="label" for="ac-pw">New password</label><input type="password" id="ac-pw" autocomplete="new-password"></div>' +
        '<div class="field"><label class="label" for="ac-pw2">New password again</label><input type="password" id="ac-pw2" autocomplete="new-password"></div>' +
        '<div class="row tight"><button class="btn primary" data-act="newpw"' + (C.busy ? " disabled" : "") + '>Save new password</button></div></section></div>';
    }
    if (!C.ok) return '<div class="wrap stack"><h1>Account</h1><p class="lede">Accounts could not load. You can still practise and run hall mode. Check your connection and refresh.</p></div>';
    if (!C.user && C.mode === "forgot") {
      return '<div class="wrap stack"><header><p class="eyebrow">Account</p><h1>Reset your password</h1><p class="lede">Enter the email you signed up with. We will send you a link to choose a new password.</p></header>' + note +
        '<section class="section stack"><div class="field"><label class="label" for="ac-email">Email</label><input type="email" id="ac-email" autocomplete="email"></div>' +
        '<div class="row tight"><button class="btn primary" data-act="sendreset"' + (C.busy ? " disabled" : "") + '>Send reset link</button><button class="btn ghost" data-act="swap">Back to sign in</button></div></section></div>';
    }
    if (!C.user) {
      var up = C.mode === "up";
      return '<div class="wrap stack"><header><p class="eyebrow">Account</p><h1>' + (up ? "Create your account" : "Sign in") + '</h1>' +
        '<p class="lede">An account puts your practice on your class leaderboard. It is free, and DxDrill works without one.</p></header>' + note +
        '<section class="section stack">' +
        (up ? '<div class="field"><label class="label" for="ac-name">Name shown on the leaderboard</label><input type="text" id="ac-name" maxlength="40" autocomplete="nickname"></div>' +
              '<div class="field"><label class="label" for="ac-class">Class</label>' + classSelect("ac-class", "") + '</div>' : "") +
        '<div class="field"><label class="label" for="ac-email">Email</label><input type="email" id="ac-email" autocomplete="email"></div>' +
        '<div class="field"><label class="label" for="ac-pw">Password</label><input type="password" id="ac-pw" autocomplete="' + (up ? "new-password" : "current-password") + '" minlength="6"></div>' +
        '<div class="row tight"><button class="btn primary" data-act="' + (up ? "signup" : "signin") + '"' + (C.busy ? " disabled" : "") + '>' + (up ? "Create account" : "Sign in") + '</button>' +
        '<button class="btn ghost" data-act="swap">' + (up ? "I already have an account" : "Create an account") + '</button>' + (up ? "" : '<button class="btn ghost" data-act="forgot">Forgot password?</button>') + '</div></section></div>';
    }
    if (!C.profile && C.down) {
      return '<div class="wrap stack"><header><p class="eyebrow">Account</p><h1>Your account</h1></header><p class="note bad">' + esc(DOWN) + '</p><div class="row tight"><button class="btn small" data-act="retryacc">Try again</button><button class="btn ghost small" data-act="signout">Sign out</button></div></div>';
    }
    var p = C.profile || { display_name: "", class_id: "", is_admin: false };
    var admin = "";
    if (p.is_admin) {
      admin = '<section class="section stack"><h2>Admin: class names</h2><p class="hint">Changes here are saved for everyone.</p>' + DX.curriculum.classes.map(function (c) {
        return '<div class="teamrow"><div class="field"><label class="label" for="cn-' + c.id + '">' + esc(c.label + " · " + c.level) + '</label><input type="text" id="cn-' + c.id + '" value="' + esc(c.name) + '" maxlength="30" placeholder="Not set yet"></div>' +
          '<button class="btn small" data-act="clsave" data-id="' + c.id + '">Save</button></div>';
      }).join("") + '</section>';
    }
    if (p.is_admin) {
      admin += '<section class="section stack"><h2>Admin: question list</h2><p class="hint">Only questions on this list count towards leaderboards. After you upload new questions to GitHub and the site has updated, open the site and press this once.</p>' +
        '<div class="row tight"><button class="btn small primary" data-act="qsync"' + (C.busy ? " disabled" : "") + '>Sync ' + DX.questions.length + ' questions</button></div></section>';
    }
    return '<div class="wrap stack"><header><p class="eyebrow">Account</p><h1>' + esc(p.display_name || "Your account") + '</h1><p class="lede">' + esc(C.user.email || "") + (p.is_admin ? " · admin" : "") + '</p></header>' + note +
      '<section class="section stack"><div class="field"><label class="label" for="ac-name">Name shown on the leaderboard</label><input type="text" id="ac-name" maxlength="40" value="' + esc(p.display_name) + '"></div>' +
      '<div class="field"><label class="label" for="ac-class">Class</label>' + classSelect("ac-class", p.class_id || "") + '</div>' +
      '<div class="row tight"><button class="btn primary" data-act="psave">Save</button><button class="btn ghost" data-act="signout">Sign out</button><a class="btn" href="#board" style="text-decoration:none">Open leaderboards</a></div></section>' + admin + (p.is_admin ? membersAdminHtml() + reportsAdminHtml() : "") + '</div>';
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ""; }
  function run(p, ok) {
    C.busy = true; C.err = ""; C.msg = "";
    return p.then(function (r) {
      C.busy = false;
      if (r && r.error) { C.err = niceError(r.error); } else if (ok) ok(r);
      repaint();
    }).catch(function (e) { C.busy = false; C.err = niceError(e); repaint(); });
  }
  function accountClick(e) {
    var b = e.target.closest("[data-act]"); if (!b || b.disabled || !C.ok) return;
    var a = b.getAttribute("data-act");
    if (a === "swap") { C.mode = C.mode === "up" ? "in" : "up"; C.err = ""; C.msg = ""; repaint(); }
    else if (a === "signin") {
      if (!val("ac-email") || !val("ac-pw")) { C.err = "Enter your email and password."; return repaint(); }
      run(C.sb.auth.signInWithPassword({ email: val("ac-email"), password: val("ac-pw") }));
    } else if (a === "signup") {
      if (val("ac-name").length < 2) { C.err = "Enter the name to show on the leaderboard."; return repaint(); }
      if (!val("ac-class")) { C.err = "Choose your class."; return repaint(); }
      if (!val("ac-email") || val("ac-pw").length < 6) { C.err = "Enter your email and a password of at least 6 characters."; return r
