/* Feature switches: the admin shows or hides features from students (Account > admin). The admin always sees everything. */
(function () {
  var DX = window.DX, esc = DX.esc;
  /* What to show if the switches cannot be loaded (first visit while offline, or the online part is paused). */
  var FALLBACK = { cards: true, polls: true, competitions: false, live: false, debates: false, friends: false };
  var LIST = [
    ["cards", "Flashcards", "Recall mode inside Play."],
    ["polls", "Polls", "The Polls page in the menu."],
    ["competitions", "Challenges", "Ranked quizzes that stay open for a few days."],
    ["live", "Live quiz", "Live rooms with a join code."],
    ["debates", "Debates", "Claims with sides, reasons and reactions."],
    ["friends", "Practice with friends", "Students can start their own small live rooms. Needs Live quiz to be open too if you want the Live page visible."]
  ];
  var SETTINGS = [["friend_max_players", "Players per friend room", 150], ["friend_active_rooms", "Friend rooms in play at once", 500], ["friend_rooms_per_day", "Rooms one student can make per day", 500]];
  var F = { settings: null, saved: "", map: DX.store.get("dx.features", null) || FALLBACK, loaded: false, err: "", busy: false, reviewId: null };
  var app = null;
  function C() { return DX.cloud; }
  function isAdmin() { return !!(C() && C().profile && C().profile.is_admin); }
  DX.features = {
    list: LIST,
    on: function (k) { return isAdmin() || F.map[k] !== false && (F.map[k] === true || !!FALLBACK[k]); },
    visibleToStudents: function (k) { return F.map[k] === true || (F.map[k] === undefined && !!FALLBACK[k]); },
    load: function () {
      if (!C() || !C().sb) return;
      C().sb.rpc("site_features").then(function (r) {
        if (r.error || !r.data) return;
        var m = {}; r.data.forEach(function (x) { m[x.key] = x.enabled; });
        F.map = m; F.loaded = true; DX.store.set("dx.features", m);
        if (DX.features.onChange) DX.features.onChange();
      }).catch(function () { });
    },
    render: render, onClick: onClick, leave: function () { }, qualityHtml: function () { return qualityHtml(); }
  };
  function repaint() { if ((location.hash || "") === "#features" && app) render(app); }
  function render(a) {
    app = a;
    if (!isAdmin()) { a.innerHTML = '<div class="wrap stack"><h1>Not available</h1><p class="lede">This page is for the admin.</p></div>'; return; }
    a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Admin</p><h1>Features and visitors</h1><p class="lede">Choose what students can see. You always see everything, so you can test a hidden feature on the real site. Changes show up for students the next time they open or reload DxDrill.</p></header>' +
      (F.err ? '<p class="note bad" role="alert">' + esc(F.err) + '</p>' : "") +
      '<section class="stack">' + LIST.map(function (x) {
        var on = F.map[x[0]] === true || (F.map[x[0]] === undefined && !!FALLBACK[x[0]]);
        return '<article class="card"><h2>' + esc(x[1]) + '</h2><p>' + esc(x[2]) + '</p><p><b>' + (on ? "Shown to students" : "Hidden from students") + '</b></p><button class="btn ' + (on ? "ghost" : "primary") + '" data-act="set" data-key="' + x[0] + '" data-on="' + (on ? "0" : "1") + '"' + (F.busy ? " disabled" : "") + '>' + (on ? "Hide" : "Show to students") + '</button></article>';
      }).join("") + '</section>' + settingsHtml() + activityHtml() + qualityHtml() + visitsHtml() + '<p class="hint">Practice, Hall mode, Leaderboards, accounts, How to start, Feedback and About are always on.</p></div>';
  }
  /* Activity: who answers a lot, and which topics students are finishing. Real data from the answers table; admin accounts are left out. */
  function topicMap() {
    var m = {}; (DX.questions || []).forEach(function (q) { (m[q.topic] = m[q.topic] || []).push(String(q.id)); });
    return m;
  }
  function activityHtml() {
    var sb = C().sb;
    if (F.act === undefined) {
      F.act = null;
      Promise.all([sb.rpc("admin_activity_summary"), sb.rpc("admin_active_people", { p_days: 7, p_limit: 20 }), sb.rpc("admin_topic_coverage", { p_map: topicMap() }), sb.rpc("admin_missed_questions", { p_days: 30, p_min: 5, p_limit: 15 })]).then(function (r) {
        F.act = (r[0].error || r[1].error || r[2].error) ? { err: true } : { sum: (r[0].data || [])[0] || {}, people: r[1].data || [], topics: r[2].data || [], missed: r[3].error ? null : (r[3].data || []) };
        repaint();
      }, function () { F.act = { err: true }; repaint(); });
    }
    var a = F.act;
    if (!a) return '<section class="section stack"><h2>Activity</h2><p class="muted">Loading…</p></section>';
    if (a.err) return '<section class="section stack"><h2>Activity</h2><p class="note bad">Run supabase/update-18.sql in Supabase first.</p></section>';
    var s = a.sum, ppl = a.people.map(function (x) {
      return '<tr><td>' + esc(x.display_name || "?") + '</td><td>' + esc(x.class_id || "") + '</td><td class="n">' + x.answers + '</td><td class="n">' + x.distinct_questions + '</td><td class="n">' + x.repeat_pct + '%</td></tr>'; }).join("");
    var shown = F.actAll ? a.topics : a.topics.slice(0, 12);
    var tps = shown.map(function (x) {
      var t = DX.topicById && DX.topicById[x.topic]; var nm = t ? t.name : x.topic;
      return '<tr><td>' + esc(nm) + '</td><td class="n">' + x.questions + '</td><td class="n">' + x.people + '</td><td class="n">' + x.finished + '</td><td class="n">' + x.answers + '</td><td class="n">' + (x.accuracy == null ? "-" : x.accuracy + "%") + '</td></tr>'; }).join("");
    var qById = null;
    function missedHtml(list) {
      if (list === null) return '<p class="hint">Run supabase/update-19.sql to see the questions students miss most.</p>';
      if (!qById) { qById = {}; (DX.questions || []).forEach(function (q) { qById[String(q.id)] = q; }); }
      var rows = list.map(function (x) {
        var q = qById[x.question_id], t = q && DX.topicById[q.topic];
        var txt = q ? String(q.q || "") : "(question no longer in the bank)";
        return '<tr><td class="n">' + x.right_pct + '%</td><td class="n">' + x.answers + '</td><td class="n">' + x.people + '</td><td>' + esc(t ? t.name : "") + '</td><td>' + esc(txt.length > 110 ? txt.slice(0, 107) + "…" : txt) + '<br><small class="muted">' + esc(x.question_id) + '</small></td></tr>';
      }).join("");
      return '<h3>Most-missed questions, last 30 days</h3><p class="hint">Questions with at least 5 answers, lowest percentage right first. A very low number can mean the question is hard, or that it is wrong or unclear. Read it before you add more on that topic.</p>' +
        (rows ? '<div style="overflow-x:auto"><table class="lvt"><thead><tr><th class="n">Right</th><th class="n">Answers</th><th class="n">People</th><th>Topic</th><th>Question</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="muted">No question has 5 answers yet.</p>');
    }
    return '<section class="section stack"><h2>Activity</h2><p class="hint">From signed-in answers only (practice without an account stays on the device). Your own account is left out.</p>' +
      '<p><b>' + (s.answers_today || 0) + '</b> answers today by <b>' + (s.people_today || 0) + '</b> people · <b>' + (s.answers_7d || 0) + '</b> in 7 days by <b>' + (s.people_7d || 0) + '</b> people</p>' +
      '<h3>Most active, last 7 days</h3><p class="hint">Repeat % is the share of a person\u2019s answers that were questions they had already answered. A high number means they are running out of fresh questions.</p>' +
      (ppl ? '<div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Name</th><th>Class</th><th class="n">Answers</th><th class="n">Different questions</th><th class="n">Repeat</th></tr></thead><tbody>' + ppl + '</tbody></table></div>' : '<p class="muted">No answers yet.</p>') +
      '<h3>Topics students are finishing</h3><p class="hint">Finished = people who have answered at least 80% of that topic\u2019s questions. Write new questions for the topics at the top first.</p>' +
      (tps ? '<div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Topic</th><th class="n">Questions</th><th class="n">People</th><th class="n">Finished</th><th class="n">Answers</th><th class="n">Right</th></tr></thead><tbody>' + tps + '</tbody></table></div>' : '<p class="muted">Nothing yet.</p>') +
      (!F.actAll && a.topics.length > 12 ? '<div class="row tight"><button class="btn ghost small" data-act="allsubj">Show all ' + a.topics.length + ' topics</button></div>' : "") +
      missedHtml(a.missed) +
      '<div class="row tight"><button class="btn ghost small" data-act="refact">Refresh</button></div></section>';
  }
  /* ---------- question quality check (runs locally on the loaded question bank) ---------- */
  var QLABEL = { long: "Correct option is much longer than the others", weak: "A wrong option is very short next to the correct one", leak: "The question text contains the answer", stem: "Looks like an explanation inside the question", aota: "Uses all/none of the above", dup: "Two options are the same" };
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  function qflags(q) {
    var fl = [];
    if (!q.options || q.options.length < 2 || typeof q.answer !== "number" || q.options[q.answer] == null) return { fl: fl, longest: false, ok: false };
    var opts = q.options.map(String), L = opts.map(function (o) { return o.trim().length; }), c = L[q.answer];
    var others = L.filter(function (x, i) { return i !== q.answer; }), mean = avg(others), max = Math.max.apply(null, others), min = Math.min.apply(null, others);
    var longest = c > max;
    if (longest && c >= 1.35 * mean && c - mean >= 12) fl.push("long");
    if (!longest && min < 0.35 * c && c >= 30) fl.push("weak");
    var ans = opts[q.answer].trim().toLowerCase(), stem = String(q.q || "").toLowerCase();
    if (ans.length >= 10 && stem.indexOf(ans) > -1) fl.push("leak");
    if (/\b(explanation|rationale|answer|note)\s*:/i.test(q.q || "") || String(q.q || "").length > 380) fl.push("stem");
    if (opts.some(function (o) { return /\b(all|none) of the above\b|\bboth [a-d] and [a-d]\b/i.test(o); })) fl.push("aota");
    var seen = {}, dup = false;
    opts.forEach(function (o) { var k = o.trim().toLowerCase(); if (seen[k]) dup = true; seen[k] = 1; });
    if (dup) fl.push("dup");
    return { fl: fl, longest: longest, ok: true };
  }
  function qualityHtml() {
    var qs = DX.questions || [], tf = DX.tfStems || [];
    if (!qs.length) return "";
    var cacheKey = qs.length + ":" + tf.length;
    if (!F.qual || F.qual.key !== cacheKey) {
      var files = {}, flagged = [], tot = 0, lng = 0;
      qs.forEach(function (q) {
        var r = qflags(q); if (!r.ok) return;
        tot++; if (r.longest) lng++;
        var f = files[q.file || "?"] = files[q.file || "?"] || { n: 0, lng: 0 }; f.n++; if (r.longest) f.lng++;
        if (r.fl.length) flagged.push({ q: q, fl: r.fl });
      });
      var tfBad = tf.filter(function (s) { var t = s.items.filter(function (x) { return x.answer; }).length; return t === 0 || t === s.items.length; }).length;
      F.qual = { key: cacheKey, tot: tot, lng: lng, files: files, flagged: flagged, tfBad: tfBad };
    }
    var Q = F.qual, pct = Q.tot ? Math.round(100 * Q.lng / Q.tot) : 0;
    var fileRows = Object.keys(Q.files).map(function (k) { var f = Q.files[k]; return { k: k, n: f.n, p: Math.round(100 * f.lng / f.n) }; })
      .filter(function (x) { return x.n >= 8; }).sort(function (a, b) { return b.p - a.p; }).slice(0, 10)
      .map(function (x) { return '<tr><td>' + esc(x.k) + '</td><td class="n">' + x.n + '</td><td class="n"><b' + (x.p >= 45 ? ' style="color:var(--bad,#b3261e)"' : "") + '>' + x.p + '%</b></td></tr>'; }).join("");
    var shown = Q.flagged.slice(0, F.qualAll ? 500 : 40).map(function (x) {
      var q = String(x.q.q || ""), id = String(x.q.id);
      return '<tr><td><button type="button" class="btn ghost small" data-act="review-question" data-id="' + esc(id) + '" aria-label="Review question ' + esc(id) + '">' + esc(id) + '</button></td><td>' + x.fl.map(function (k) { return '<span class="chip">' + esc(QLABEL[k]) + '</span>'; }).join(" ") + '</td><td>' + esc(q.length > 110 ? q.slice(0, 110) + "…" : q) + '</td></tr>';
    }).join("");
    var selected = F.reviewId && Q.flagged.find(function (x) { return String(x.q.id) === String(F.reviewId); });
    var reviewHtml = "";
    if (selected) {
      var rq = selected.q, letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      var optsHtml = (rq.options || []).map(function (o, i) {
        var correct = i === rq.answer;
        return '<li style="padding:10px 12px;margin:6px 0;border:1px solid ' + (correct ? 'var(--good,#287a45)' : 'var(--line,rgba(127,127,127,.25))') + ';border-radius:10px;' + (correct ? 'background:rgba(40,122,69,.08);' : '') + '"><b>' + letters.charAt(i) + '.</b> ' + esc(o) + (correct ? ' <span class="chip">Correct answer</span>' : '') + '</li>';
      }).join("");
      reviewHtml = '<div role="presentation" data-act="review-backdrop" style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;">' +
        '<section role="dialog" aria-modal="true" aria-labelledby="quality-review-title" class="card stack" style="width:min(760px,100%);max-height:90vh;overflow:auto;background:var(--surface,Canvas);color:var(--text,CanvasText);padding:20px;">' +
        '<div class="row" style="align-items:center;justify-content:space-between;gap:12px;"><div><p class="eyebrow">Question review</p><h2 id="quality-review-title">' + esc(String(rq.id)) + '</h2></div><button type="button" class="btn ghost small" data-act="close-review" aria-label="Close question review">Close</button></div>' +
        '<p class="hint">' + esc(rq.file || "Source file unavailable") + (rq.sub ? ' · ' + esc(rq.sub) : '') + (rq.level != null ? ' · Level ' + esc(String(rq.level)) : '') + '</p>' +
        (rq.image && DX.qImg ? DX.qImg(rq, "review") : "") +
        '<h3>Question</h3><p>' + esc(rq.q || "") + '</p><h3>Options</h3><ol style="list-style:none;padding:0;margin:0;">' + optsHtml + '</ol>' +
        '<h3>Explanation</h3><p>' + esc(rq.explain || "No explanation is recorded for this question.") + '</p>' +
        (rq.verified === false ? '<p class="note">This question is not marked as verified in the source data.</p>' : '') +
        (rq.open && rq.open.q ? '<details><summary>Related open-ended prompt</summary><p>' + esc(rq.open.q) + '</p>' + (rq.open.accept && rq.open.accept.length ? '<p><b>Accepted answers:</b> ' + esc(rq.open.accept.join("; ")) + '</p>' : '') + '</details>' : '') +
        '<div class="row tight"><button type="button" class="btn primary" data-act="close-review">Done</button></div></section></div>';
    }
    return '<section class="section stack"><h2>Question quality check</h2>' +
      '<p class="hint">Checks every loaded multiple-choice question for patterns that can make an answer easy to guess. It runs in this browser; nothing is sent anywhere. Treat flags as review prompts, not proof that a question is wrong.</p>' +
      '<p>The correct option is the <b>longest</b> in <b>' + pct + '%</b> of ' + Q.tot + ' eligible questions. With four evenly written options that would be about 25%; a higher rate may indicate a pattern worth reviewing.</p>' +
      (fileRows ? '<h3>Files where the correct option is most often the longest</h3><div style="overflow-x:auto"><table class="lvt"><thead><tr><th>File</th><th class="n">Questions</th><th class="n">Longest is correct</th></tr></thead><tbody>' + fileRows + '</tbody></table></div>' : "") +
      '<h3>' + Q.flagged.length + ' question' + (Q.flagged.length === 1 ? "" : "s") + ' to review</h3>' +
      (Q.flagged.length ? '<div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Id</th><th>Why</th><th>Question</th></tr></thead><tbody>' + shown + '</tbody></table></div>' +
        '<div class="row tight">' + (Q.flagged.length > 40 && !F.qualAll ? '<button class="btn ghost small" data-act="qualall">Show more</button>' : "") + '<button class="btn ghost small" data-act="copyflag">Copy the ids</button></div>' : '<p class="muted">Nothing flagged in the loaded questions.</p>') +
      (Q.tfBad ? '<p class="note bad">' + Q.tfBad + ' true/false stem' + (Q.tfBad === 1 ? ' has' : 's have') + ' only true or only false statements. Review their balance.</p>' : "") + reviewHtml + '</section>';
  }
  function pagesHtml(list) {
    if (list === null || list === undefined) return '<p class="hint">Run supabase/update-17.sql to see which pages people open.</p>';
    if (!list.length) return '<h3>Pages people open (last 14 days)</h3><p class="muted">Nothing recorded yet. This starts counting after update 17.</p>';
    return '<h3>Pages people open (last 14 days)</h3><p class="hint">Visitors = different phones or browsers. Opens = times the page was opened. Your own visits are left out.</p><div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Page</th><th class="n">Visitors</th><th class="n">Opens</th></tr></thead><tbody>' +
      list.map(function (x) { return '<tr><td>' + esc(String(x.page).charAt(0).toUpperCase() + String(x.page).slice(1)) + '</td><td class="n">' + x.visitors + '</td><td class="n">' + x.loads + '</td></tr>'; }).join("") + '</tbody></table></div>';
  }
  function visitsHtml() {
    if (F.visits === undefined) {
      F.visits = null;
      Promise.all([C().sb.rpc("admin_visit_totals"), C().sb.rpc("admin_visits", { p_days: 14 }), C().sb.rpc("admin_pages", { p_days: 14 })]).then(function (r) {
        if (r[0].error || r[1].error) { F.visits = { err: true }; } else { F.visits = { tot: (r[0].data || [])[0] || {}, days: r[1].data || [], pages: r[2].error ? null : (r[2].data || []) }; }
        repaint();
      }, function () { F.visits = { err: true }; repaint(); });
    }
    var v = F.visits;
    if (!v) return '<section class="section stack"><h2>Visitors</h2><p class="muted">Loading…</p></section>';
    if (v.err) return '<section class="section stack"><h2>Visitors</h2><p class="note bad">Run supabase/update-13.sql in Supabase first.</p></section>';
    var t = v.tot, rows = v.days.map(function (d) { return '<tr><td>' + esc(d.day) + '</td><td class="n">' + d.visitors + '</td><td class="n">' + d.signed_in + '</td><td class="n">' + d.hits + '</td></tr>'; }).join("");
    return '<section class="section stack"><h2>Visitors</h2><p class="hint">Each phone or browser counts once per day, signed in or not. The same person on two devices counts twice, and your own visits are left out. Counts start from the day you run update 13.</p>' +
      '<p><b>' + (t.today || 0) + '</b> today · <b>' + (t.week || 0) + '</b> in 7 days · <b>' + (t.month || 0) + '</b> in 30 days (<b>' + (t.signed_month || 0) + '</b> of them signed in at some point)</p>' +
      (rows ? '<div style="overflow-x:auto"><table class="lvt"><thead><tr><th>Day</th><th class="n">Visitors</th><th class="n">Signed in</th><th class="n">Page loads</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="muted">No visits recorded yet.</p>') +
      pagesHtml(v.pages) +
      '<div class="row tight"><button class="btn ghost small" data-act="refvisits">Refresh</button></div></section>';
  }
  function settingsHtml() {
    if (F.settings === null) { F.settings = {}; C().sb.rpc("admin_site_settings").then(function (r) { if (!r.error && r.data) { r.data.forEach(function (x) { F.settings[x.key] = x.val; }); F.settings.__ok = true; repaint(); } }); }
    if (!F.settings.__ok) return "";
    return '<section class="section stack"><h2>Practice with friends: limits</h2><p class="hint">These keep the free plan safe. Raise them slowly after you see how the pilot goes.</p>' +
      SETTINGS.map(function (s) { return '<div class="field"><label class="label" for="st-' + s[0] + '">' + esc(s[1]) + '</label><input type="number" id="st-' + s[0] + '" min="1" max="' + s[2] + '" value="' + esc(F.settings[s[0]]) + '"></div>'; }).join("") +
      '<div class="row tight"><button class="btn primary" data-act="savesettings"' + (F.busy ? " disabled" : "") + '>Save limits</button></div>' + (F.saved ? '<p class="note" role="status">' + esc(F.saved) + '</p>' : "") + '</section>';
  }
  function onClick(e) {
    var sv = e.target.closest ? e.target.closest("[data-act='savesettings']") : null;
    if (sv) {
      F.busy = true; F.saved = ""; F.err = ""; repaint();
      Promise.all(SETTINGS.map(function (s) { var el = document.getElementById("st-" + s[0]); var v = parseInt(el && el.value, 10); if (!v) return null; return C().sb.rpc("admin_set_setting", { p_key: s[0], p_val: v }).then(function (r) { if (r.error) throw r.error; F.settings[s[0]] = Math.min(v, s[2]); }); }))
        .then(function () { F.busy = false; F.saved = "Saved."; repaint(); })
        .catch(function () { F.busy = false; F.err = "That did not save. Run supabase/update-10.sql first, then try again."; repaint(); });
      return;
    }
    var reviewBtn = e.target.closest ? e.target.closest("[data-act='review-question']") : null;
    if (reviewBtn) { F.reviewId = reviewBtn.getAttribute("data-id"); repaint(); return; }
    if (e.target.closest && (e.target.closest("[data-act='close-review']") || e.target.closest("[data-act='review-backdrop']") === e.target)) { F.reviewId = null; repaint(); return; }
    if (e.target.closest && e.target.closest("[data-act='qualall']")) { F.qualAll = true; repaint(); return; }
    var cf = e.target.closest ? e.target.closest("[data-act='copyflag']") : null;
    if (cf && F.qual) {
      var txt = F.qual.flagged.map(function (x) { return x.q.id; }).join("\n");
      var done = function () { cf.textContent = "Copied"; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { window.prompt("Copy these ids:", txt); });
      else window.prompt("Copy these ids:", txt);
      return;
    }
    if (e.target.closest && e.target.closest("[data-act='refact']")) { F.act = undefined; repaint(); return; }
    if (e.target.closest && e.target.closest("[data-act='allsubj']")) { F.actAll = true; repaint(); return; }
    if (e.target.closest && e.target.closest("[data-act='refvisits']")) { F.visits = undefined; repaint(); return; }
    var t = e.target.closest ? e.target.closest("[data-act='set']") : null; if (!t) return;
    var key = t.getAttribute("data-key"), on = t.getAttribute("data-on") === "1";
    F.busy = true; F.err = ""; repaint();
    C().sb.rpc("admin_set_feature", { p_key: key, p_on: on }).then(function (r) {
      if (r.error) throw r.error; F.map[key] = on; DX.store.set("dx.features", F.map); F.busy = false; repaint(); if (DX.features.onChange) DX.features.onChange();
    }).catch(function (er) {
      F.busy = false; F.err = /schema cache|does not exist|site_features|admin_set_feature/i.test((er && er.message) || "") ? "Run supabase/update-9.sql in Supabase first." : "That did not save. Try again."; repaint();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && F.reviewId) { F.reviewId = null; repaint(); }
  });
})();
