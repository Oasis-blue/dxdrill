/* Accounts, class names and leaderboards through Supabase. If Supabase cannot be reached, the rest of DxDrill still works. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var CFG = {
    url: "https://dkullruinrnwjmhlxlpl.supabase.co",
    key: "sb_publishable_azxnKz5UEbn3yuZjyqTZWQ_oYaOs92Z"   /* publishable key: safe to be public */
  };
  var C = { sb: null, user: null, profile: null, ok: false, msg: "", err: "", busy: false, mode: "in", board: { days: 7, cls: "", loaded: false, students: [], classes: [], error: "" } };
  DX.cloud = C;
  C.app = null;
  C.tfStats = { loading: false, loaded: false, data: null, error: "" };
  C.reviewMistakes = { loading: false, loaded: false, rows: [], error: "" };
  DX.remoteMissedIds = {};
  C.loadReviewMistakes = function (force) {
    var R = C.reviewMistakes;
    if (!C.ok || !C.user || R.loading || (R.loaded && !force)) return Promise.resolve(R.rows);
    R.loading = true; R.error = "";
    return C.sb.rpc("my_review_mistakes").then(function (res) {
      R.loading = false; R.loaded = true;
      if (res.error) { R.error = "Could not load synced mistakes. Check that supabase/update-22.sql has been run."; return R.rows; }
      R.rows = Array.isArray(res.data) ? res.data : [];
      var ids = {}, state = {};
      R.rows.forEach(function (x) {
        if (!x || !x.question_id) return;
        state[String(x.question_id)] = !x.last_attempt_correct;
        if (!x.last_attempt_correct) ids[String(x.question_id)] = true;
      });
      DX.remoteMissedIds = ids;
      DX.remoteReviewState = state;
      if (DX.practice && DX.practice.refreshProgress) DX.practice.refreshProgress();
      return R.rows;
    }).catch(function () {
      R.loading = false; R.loaded = true; R.error = "Could not reach the server.";
      return R.rows;
    });
  };

  C.syncStreak = function () {
    if (!C.ok || !C.user || !C.sb || C.streakSyncing) return Promise.resolve(false);
    var local = DX.store.get("dx.streak", null);
    if (!local || typeof local !== "object") local = { c: 0, last: "", best: 0, d: "", n: 0, days: [] };
    var days = Array.isArray(local.days) ? local.days.slice() : [];
    if (!days.length && local.last && Number(local.c) > 0) {
      for (var i = Math.max(0, Number(local.c) - 1); i >= 0; i--) {
        var dt = new Date(local.last + "T12:00:00Z"); dt.setUTCDate(dt.getUTCDate() - i);
        days.push(dt.toISOString().slice(0, 10));
      }
    }
    C.streakSyncing = true;
    return C.sb.rpc("sync_my_streak", { p_days: days, p_best: Number(local.best) || 0 }).then(function (r) {
      C.streakSyncing = false;
      if (r.error || !r.data) { C.streakSyncError = "Streak sync is temporarily unavailable."; return false; }
      var merged = Array.from(new Set(days.concat(Array.isArray(r.data.days) ? r.data.days : []))).sort();
      local.days = merged;
      local.best = Math.max(Number(local.best) || 0, Number(r.data.best) || 0);
      var latest = merged.length ? merged[merged.length - 1] : "";
      function shiftDay(day, n) { var d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
      var count = 0, cursor = latest;
      while (cursor && merged.indexOf(cursor) > -1) { count++; cursor = shiftDay(cursor, -1); }
      local.c = count; local.last = latest;
      DX.store.set("dx.streak", local);
      C.streakSyncError = "";
      if (DX.refreshHome && (location.hash || "#home") === "#home") DX.refreshHome();
      return true;
    }).catch(function () { C.streakSyncing = false; C.streakSyncError = "Streak sync is temporarily unavailable."; return false; });
  };

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
    if (/sending (recovery|confirmation|magic|email)|error sending/i.test(m)) return false;   /* the server answered, it just could not send the email */
    return e.name === "AuthRetryableFetchError" || e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504 || e.status === 540 || (!e.code && !e.status && /fetch|network|timeout|json|unexpected|load failed/i.test(m));
  };
  function niceError(e) {
    if (C.isDown(e)) return DOWN;
    var m = (e && e.message) || "Something went wrong.";
    if (/sending (recovery|confirmation|magic|email)|error sending/i.test(m)) return "The email could not be sent. The admin needs to finish the email setup in Supabase (custom SMTP).";
    if (/not authorized/i.test(m) && /email/i.test(m)) return "Emails can only go to the Supabase team until custom email (SMTP) is set up. The admin needs to finish that setup.";
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
  function learningTopicMap() {
    var map = {};
    (DX.questions || []).forEach(function (q) {
      if (!q || !q.id || !q.topic) return;
      if (!map[q.topic]) map[q.topic] = [];
      map[q.topic].push(String(q.id));
    });
    return map;
  }
  function loadMyTFStats() {
    var S = C.tfStats;
    if (!C.ok || !C.user || S.loading || S.loaded) return;
    /* The account page can open while question files are still loading. Wait for
       the complete bank so the topic map includes every question before querying. */
    if (DX.loadingQuestions || !DX.questionsReady) {
      if (!S.waitingForBank) {
        S.waitingForBank = true;
        var previousOnMore = DX.onMore;
        DX.onMore = function () {
          if (previousOnMore) previousOnMore();
          if (S.waitingForBank) {
            S.waitingForBank = false;
            loadMyTFStats();
            loadMyAnalytics();
          }
        };
      }
      return;
    }
    S.loading = true;
    C.sb.rpc("my_learning_progress", { p_map: learningTopicMap() }).then(function (r) {
      S.loading = false; S.loaded = true;
      if (r.error) { S.error = "Could not load your synced learning progress. Check that supabase/update-21.sql has been run."; }
      else { S.data = r.data || null; }
      repaint();
    }).catch(function () { S.loading = false; S.loaded = true; S.error = "Could not reach the server."; repaint(); });
  }
  C.analytics = { loading: false, loaded: false, data: null, error: "" };
  function loadMyAnalytics() {
    var A = C.analytics;
    if (!C.ok || !C.user || A.loading || A.loaded) return;
    if (DX.loadingQuestions || !DX.questionsReady) return;
    A.loading = true;
    C.sb.rpc("my_learning_analytics", { p_map: learningTopicMap() }).then(function (r) {
      A.loading = false; A.loaded = true;
      if (r.error) A.error = "Could not load learning analytics. Run supabase/update-23.sql in Supabase.";
      else A.data = r.data || null;
      repaint();
    }).catch(function () { A.loading = false; A.loaded = true; A.error = "Could not reach the server for learning analytics."; repaint(); });
  }
  function analyticsHtml() {
    var A = C.analytics, d = A.data || {}, days = d.daily || [], topics = d.topics || [];
    if (!A.loaded || A.loading) return '<h3>Learning trends</h3><p class="muted">Loading your 14-day learning trends…</p>';
    if (A.error) return '<h3>Learning trends</h3><p class="hint">' + esc(A.error) + '</p>';
    var max = days.reduce(function (m, x) { return Math.max(m, Number(x.responses || 0)); }, 0) || 1;
    var bars = days.map(function (x) {
      var n = Number(x.responses || 0), w = Math.round(n / max * 100);
      return '<div class="rep-item" style="display:grid;grid-template-columns:76px 1fr 34px;gap:8px;align-items:center"><span class="hint">' +
        esc(new Date(x.day + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })) +
        '</span><span style="height:9px;background:var(--line);border-radius:8px;overflow:hidden"><span style="display:block;height:9px;width:' + w + '%;background:var(--accent);border-radius:8px"></span></span><b style="text-align:right">' + n + '</b></div>';
    }).join("");
    var active = topics.filter(function (t) { return Number(t.current_responses || 0) >= 3 && t.current_accuracy != null && t.previous_accuracy != null; });
    active.sort(function (a, b) { return (Number(b.current_accuracy) - Number(b.previous_accuracy)) - (Number(a.current_accuracy) - Number(a.previous_accuracy)); });
    function trendRow(t) {
      var delta = Number(t.current_accuracy) - Number(t.previous_accuracy);
      var label = delta >= 5 ? "Improving" : delta <= -5 ? "Needs attention" : "About steady";
      var sign = delta > 0 ? "+" : "";
      var name = DX.topicById[t.topic] ? DX.topicById[t.topic].name : t.topic;
      return '<div class="rep-item"><b>' + esc(name) + '</b><p class="hint">' + label + ' · ' + t.previous_accuracy + '% to ' + t.current_accuracy + '% (' + sign + delta + ' points) · ' + t.current_responses + ' recent responses</p></div>';
    }
    var improved = active.filter(function (t) { return Number(t.current_accuracy) - Number(t.previous_accuracy) >= 5; });
    var declined = active.filter(function (t) { return Number(t.current_accuracy) - Number(t.previous_accuracy) <= -5; });
    return '<h3>Learning trends</h3><p class="hint">Last 14 days · ' + (d.responses_14d || 0) + ' responses · ' + (d.responses_7d || 0) + ' in the last 7 days · active on ' + (d.active_days_14d || 0) + ' of 14 days</p>' +
      (days.length ? '<h4>Daily practice</h4>' + bars : '<p class="muted">No recent activity yet.</p>') +
      '<h4>Topic changes</h4>' +
      (active.length ? active.slice(0, 8).map(trendRow).join("") : '<p class="muted">Topic trends will appear after you have enough activity in both the current and previous 14-day periods.</p>') +
      '<p class="hint">Improving topics: ' + improved.length + ' · Topics needing attention: ' + declined.length + '. Trends compare accuracy across two 14-day periods and are shown only when each period has recorded responses.</p>';
  }
  function progressHtml() {
    var S = C.tfStats, d = S.data || {}, topics = d.topics || [], recent = d.recent || [];
    if (!S.loaded || S.loading) return '<section class="section stack"><h2>Your learning progress</h2><p class="muted">Loading your synced MCQ and True/False activity…</p></section>';
    if (S.error) return '<section class="section stack"><h2>Your learning progress</h2><p class="hint">' + esc(S.error) + '</p></section>';
    var pct = function (v) { return v == null ? "—" : Number(v) + "%"; };
    var topicActivity = function (t) { return Number(t.mcq_attempts || 0) + Number(t.tf_statements || 0); };
    var weak = topics.filter(function (t) { return topicActivity(t) >= 3 && ((t.mcq_accuracy != null && Number(t.mcq_attempts || 0) >= 3 && Number(t.mcq_accuracy) < 70) || (t.tf_accuracy != null && Number(t.tf_statements || 0) >= 3 && Number(t.tf_accuracy) < 70)); });
    var sortedTopics = topics.slice().sort(function (a, b) { return topicActivity(b) - topicActivity(a); });
    function topicRow(t) {
      var name = DX.topicById[t.topic] ? DX.topicById[t.topic].name : t.topic;
      return '<div class="rep-item"><b>' + esc(name) + '</b><p class="hint">MCQ: ' + (t.mcq_attempts || 0) + ' attempts · ' + (t.mcq_correct || 0) + ' correct · ' + pct(t.mcq_accuracy) +
        ' &nbsp;|&nbsp; T/F: ' + (t.tf_stems || 0) + ' stems · ' + (t.tf_statements || 0) + ' statements · ' + pct(t.tf_accuracy) + '</p></div>';
    }
    function recentRow(x) {
      var name = DX.topicById[x.topic] ? DX.topicById[x.topic].name : x.topic;
      var date = x.created_at ? new Date(x.created_at).toLocaleString() : "";
      return '<div class="rep-item"><b>' + (x.kind === "mcq" ? "MCQ" : "True/False") + '</b> · ' + esc(name || "Topic") +
        '<p class="hint">' + (x.kind === "mcq" ? esc(x.item_id) : "Stem " + esc(x.item_id)) + ' · ' + (x.correct || 0) + '/' + (x.answered || 0) + ' correct · ' + esc(date) + '</p></div>';
    }
    var topicPreview = sortedTopics.slice(0, 5).map(topicRow).join("");
    var topicMore = sortedTopics.slice(5).map(topicRow).join("");
    var weakPreview = weak.slice(0, 3).map(function (t) {
      return '<p class="hint">• ' + esc(DX.topicById[t.topic] ? DX.topicById[t.topic].name : t.topic) + ' — below 70% in a format with at least 3 responses</p>';
    }).join("");
    var weakMore = weak.slice(3).map(function (t) {
      return '<p class="hint">• ' + esc(DX.topicById[t.topic] ? DX.topicById[t.topic].name : t.topic) + ' — below 70% in a format with at least 3 responses</p>';
    }).join("");
    var recentPreview = recent.slice(0, 3).map(recentRow).join("");
    var recentMore = recent.slice(3).map(recentRow).join("");
    return '<section class="section stack"><h2>Your learning progress</h2><p class="hint">Synced to your account. MCQ attempts include repeat practice; leaderboard points still count each distinct correctly answered question only.</p>' +
      '<h3>Overall</h3><div class="statrow"><div class="stat"><b>' + (d.overall_attempts || 0) + '</b><span>responses</span></div>' +
      '<div class="stat"><b>' + (d.overall_correct || 0) + '</b><span>correct</span></div><div class="stat"><b>' + pct(d.overall_accuracy) + '</b><span>accuracy</span></div>' +
      '<div class="stat"><b>' + (d.mcq_questions || 0) + '</b><span>distinct MCQs</span></div></div>' +
      '<h3>MCQ</h3><p class="hint">' + (d.mcq_attempts || 0) + ' responses · ' + (d.mcq_correct || 0) + ' correct · ' + pct(d.mcq_accuracy) + ' accuracy</p>' +
      '<h3>True/False</h3><p class="hint">' + (d.tf_stems_attempted || 0) + ' stem attempts · ' + (d.tf_stems_completed || 0) + ' fully completed · ' + (d.tf_statements || 0) + ' statements · ' + pct(d.tf_accuracy) + ' accuracy</p>' +
      '<h3>Topic performance</h3>' + (topics.length ? topicPreview + (topicMore ? '<details class="rep-more"><summary>Show all ' + topics.length + ' topics</summary>' + topicMore + '</details>' : '') : '<p class="muted">No synced topic activity yet. Complete a signed-in practice session to begin.</p>') +
      '<h3>Topics to revisit</h3>' + (weak.length ? weakPreview + (weakMore ? '<details class="rep-more"><summary>Show all ' + weak.length + ' topics to revisit</summary>' + weakMore + '</details>' : '') : '<p class="muted">No topic has enough low-scoring activity to flag yet.</p>') +
      '<h3>Recent practice</h3>' + (recent.length ? recentPreview + (recentMore ? '<details class="rep-more"><summary>Show all ' + recent.length + ' recent entries</summary>' + recentMore + '</details>' : '') : '<p class="muted">No recent synced activity.</p>') + analyticsHtml() + '</section>';
  }
  function loadClasses() {
    return C.sb.from("classes").select("id,name,level").then(function (r) {
      if (r.error || !r.data) return;
      r.data.forEach(function (row) {
        DX.curriculum.classes.forEach(function (k) { if (k.id === row.id) { k.name = row.name || ""; if (row.level) k.level = row.level; } });
      });
    });
  }


  /* A phone whose date or time is wrong makes sign-in fail straight away. Ask the server what time it is and warn if the phone is far off. */
  function checkClock() {
    try {
      var t0 = Date.now();
      C.sb.rpc("server_time").then(function (r) {
        if (!r || r.error || !r.data) return;
        var t1 = Date.now(), server = new Date(r.data).getTime(), diff = server - (t0 + t1) / 2;
        if (isNaN(diff) || Math.abs(diff) < 5 * 60 * 1000) return;
        var mins = Math.round(Math.abs(diff) / 60000), txt = mins >= 2880 ? Math.round(mins / 1440) + " days" : mins >= 120 ? Math.round(mins / 60) + " hours" : mins + " minutes";
        var d = document.createElement("div"); d.setAttribute("role", "alert"); d.id = "clockwarn";
        d.style.cssText = "position:relative;z-index:50;background:#fff3cd;color:#4a3800;border-bottom:2px solid #e0a800;padding:10px 16px;font-size:15px;line-height:1.4";
        d.innerHTML = "<b>Your device’s date or time looks wrong</b> (about " + txt + " " + (diff > 0 ? "behind" : "ahead") + "). DxDrill may sign you out straight away. Turn on automatic date and time in your phone or computer settings, then reload this page. " +
          '<button type="button" style="margin-left:6px;border:1.5px solid #4a3800;background:transparent;color:inherit;border-radius:8px;padding:2px 10px;font:inherit">Dismiss</button>';
        d.querySelector("button").onclick = function () { d.remove(); };
        document.body.insertBefore(d, document.body.firstChild);
      }).catch(function () { });
    } catch (e) { }
  }

  C.init = function () {
    if (!window.supabase || !window.supabase.createClient) { C.msg = "offline"; return Promise.resolve(); }
    try {
      C.sb = window.supabase.createClient(CFG.url, CFG.key);
    } catch (e) { return Promise.resolve(); }
    C.ok = true;
    window.addEventListener("online", function () { if (C.user && C.syncStreak) C.syncStreak(); });
    checkClock();
    if (DX.features) DX.features.load();
    C.sb.auth.onAuthStateChange(function (ev, session) {
      var priorUserId = C.user && C.user.id;
      C.user = session ? session.user : null;
      if (!C.user || priorUserId !== C.user.id) { C.tfStats = { loading: false, loaded: false, data: null, error: "" }; C.analytics = { loading: false, loaded: false, data: null, error: "" }; }
      F = {};
      if (ev === "PASSWORD_RECOVERY") { C.mode = "reset"; C.err = ""; C.msg = ""; if ((location.hash || "") !== "#account") location.hash = "#account"; }
      loadProfile().then(function () { flush(); if (C.user && C.syncStreak) C.syncStreak(); repaint(); if (C.user && C.loadReviewMistakes) C.loadReviewMistakes(true); });
    });
    /* The page can show as soon as we know who is signed in (read from the device). The profile and class names load behind it. */
    var got = C.sb.auth.getSession().then(function (r) {
      C.user = r.data && r.data.session ? r.data.session.user : null;
    });
    C.loading = got.then(function () { return Promise.all([loadProfile(), loadClasses()]); }).then(function () { return flush(); }).then(function () { if (C.user) C.syncStreak(); }).catch(function () { C.down = true; /* offline is fine */ }).then(function () { repaint(); if (C.user && C.loadReviewMistakes) C.loadReviewMistakes(true); });
    return got.catch(function () { C.down = true; });
  };

  /* Scores: queued on the device and sent when signed in, so nothing is lost offline. */
  function queue() { return DX.store.get("dx.pending", []); }
  function tfQueue() { return DX.store.get("dx.tf.pending", []); }
  var tfFlushing = false, tfRetryBlocked = false;
  function flushTF() {
    if (!C.ok || !C.user || tfFlushing || tfRetryBlocked) return Promise.resolve();
    var q = tfQueue(); if (!q.length) return Promise.resolve();
    var batch = q.slice(0, 100), sent = Object.create(null);
    batch.forEach(function (x) { sent[x.attempt_id + "|" + x.stem_id] = 1; });
    tfFlushing = true;
    return C.sb.from("tf_attempts").upsert(batch.map(function (x) {
      return { attempt_id: x.attempt_id, stem_id: x.stem_id, topic_id: x.topic_id,
        answered_count: x.answered_count, correct_count: x.correct_count, total_count: x.total_count };
    }), { onConflict: "user_id,attempt_id,stem_id", ignoreDuplicates: true }).then(function (r) {
      if (!r.error) {
        DX.store.set("dx.tf.pending", tfQueue().filter(function (x) { return !sent[x.attempt_id + "|" + x.stem_id]; }));
        tfRetryBlocked = false;
      } else if (/daily limit/i.test(r.error.message || "")) {
        /* Keep the unsent attempts. Retry after the limit window, not by deleting learning history. */
        tfRetryBlocked = true;
      }
      tfFlushing = false;
      if (!r.error && tfQueue().length) return flushTF();
    }).catch(function () { tfFlushing = false; });
  }
  var mcqFlushing = false, mcqRetryBlocked = false;
  function flush() {
    if (!C.ok || !C.user || mcqFlushing || mcqRetryBlocked) return Promise.resolve();
    var q = queue();
    if (!q.length) return flushTF();
    var batch = q.slice(0, 200);
    mcqFlushing = true;
    return C.sb.from("answers").insert(batch.map(function (x) { return { question_id: x.id, correct: x.ok }; })).then(function (r) {
      if (!r.error) {
        var current = queue();
        /* Remove only the batch that was actually sent; keep anything queued during the request. */
        var samePrefix = batch.every(function (x, i) { return current[i] && current[i].id === x.id && current[i].ok === x.ok; });
        if (samePrefix) DX.store.set("dx.pending", current.slice(batch.length));
        mcqRetryBlocked = false;
      } else if (/daily limit/i.test(r.error.message || "")) {
        /* Do not silently discard pending answers when the server's daily cap is reached. */
        mcqRetryBlocked = true;
      }
      mcqFlushing = false;
      if (!r.error && queue().length) return flush();
      return flushTF();
    }).catch(function () { mcqFlushing = false; return flushTF(); });
  }
  C.submit = function (items) {
    var q = queue().concat(items.map(function (x) { return { id: String(x.id), ok: !!x.ok }; })), seen = Object.create(null);
    q = q.filter(function (x) { var k = x.id + "|" + x.ok; if (seen[k]) return false; seen[k] = 1; return true; });
    DX.store.set("dx.pending", q.slice(-500));
    flush();
  };
  C.submitTF = function (attempt) {
    if (!attempt || !attempt.answered_count) return;
    var item = {
      attempt_id: String(attempt.attempt_id || (Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12))),
      stem_id: String(attempt.stem_id), topic_id: String(attempt.topic_id),
      answered_count: Math.max(1, Math.min(5, Number(attempt.answered_count) || 0)),
      correct_count: Math.max(0, Math.min(5, Number(attempt.correct_count) || 0)),
      total_count: Math.max(4, Math.min(5, Number(attempt.total_count) || 4))
    };
    item.answered_count = Math.min(item.answered_count, item.total_count);
    item.correct_count = Math.min(item.correct_count, item.answered_count);
    var q = tfQueue().concat([item]), seen = Object.create(null);
    q = q.filter(function (x) { var k = x.attempt_id + "|" + x.stem_id; if (seen[k]) return false; seen[k] = 1; return true; });
    DX.store.set("dx.tf.pending", q.slice(-500));
    flushTF();
  };
  window.addEventListener("online", function () { mcqRetryBlocked = false; tfRetryBlocked = false; flush(); });

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
      return '<div class="rep-item"><span class="label">' + esc(m.email || "") + ' · joined ' + esc(joined) + ' · ' + Number(m.points) + ' points · ' + Number(m.answers_total) + ' responses</span>' +
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
  function showPw() { return '<button type="button" class="btn ghost small" data-act="showpw" aria-pressed="' + (!!C.showpw) + '" style="margin-top:6px">' + (C.showpw ? "Hide password" : "Show password") + '</button>'; }
  function accountView() {
    var note = (C.err ? '<p class="note bad" role="alert">' + esc(C.err) + '</p>' : "") + (C.msg && C.msg !== "offline" ? '<p class="note">' + esc(C.msg) + '</p>' : "");
    if (C.ok && C.user && C.mode === "reset") {
      return '<div class="wrap stack"><header><p class="eyebrow">Account</p><h1>Choose a new password</h1><p class="lede">You opened the reset link from your email. Pick a new password for your account.</p></header>' + note +
        '<section class="section stack"><div class="field"><label class="label" for="ac-pw">New password</label><input type="password" id="ac-pw" autocomplete="new-password" aria-describedby="pwhint2"><p class="hint" id="pwhint2">At least 6 characters.</p></div>' +
        '<div class="field"><label class="label" for="ac-pw2">New password again</label><input type="password" id="ac-pw2" autocomplete="new-password">' + showPw() + '</div>' +
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
        '<div class="field"><label class="label" for="ac-pw">Password</label><input type="password" id="ac-pw" autocomplete="' + (up ? "new-password" : "current-password") + '" minlength="6"' + (up ? ' aria-describedby="pwhint"' : "") + '>' + (up ? '<p class="hint" id="pwhint">At least 6 characters.</p>' : "") + showPw() + '</div>' +
        '<div class="row tight"><button class="btn primary" data-act="' + (up ? "signup" : "signin") + '"' + (C.busy ? " disabled" : "") + '>' + (up ? "Create account" : "Sign in") + '</button>' +
        '<button class="btn ghost" data-act="swap">' + (up ? "I already have an account" : "Create an account") + '</button>' + (up ? "" : '<button class="btn ghost" data-act="forgot">Forgot password?</button>') + '</div></section></div>';
    }
    if (!C.profile && C.down) {
      return '<div class="wrap stack"><header><p class="eyebrow">Account</p><h1>Your account</h1></header><p class="note bad">' + esc(DOWN) + '</p><div class="row tight"><button class="btn small" data-act="retryacc">Try again</button><button class="btn ghost small" data-act="signout">Sign out</button></div></div>';
    }
    var p = C.profile || { display_name: "", class_id: "", is_admin: false };
    var admin = "";
    if (p.is_admin) {
      admin = '<section class="section stack"><h2>Admin: features and visitors</h2><p><a href="#features">Open features and visitors</a></p></section><section class="section stack"><h2>Admin: classes</h2><p class="hint">Rename a class or move it to a new level (for example 300L to 400L at the start of a session). Changes are saved for everyone.</p>' + DX.curriculum.classes.map(function (c) {
        return '<div class="teamrow"><div class="field"><label class="label" for="cn-' + c.id + '">' + esc(c.label) + ' name</label><input type="text" id="cn-' + c.id + '" value="' + esc(c.name) + '" maxlength="30" placeholder="Not set yet"></div>' +
          '<div class="field"><label class="label" for="cl-' + c.id + '">Level</label><input type="text" id="cl-' + c.id + '" value="' + esc(c.level) + '" maxlength="8" placeholder="300L"></div>' +
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
      '<div class="row tight"><button class="btn primary" data-act="psave">Save</button><button class="btn ghost" data-act="signout">Sign out</button><a class="btn" href="#board" style="text-decoration:none">Open leaderboards</a></div></section>' + (DX.reminders ? DX.reminders.html() : "") + progressHtml() + admin + (p.is_admin ? membersAdminHtml() + reportsAdminHtml() : "") + '</div>';
  }
  /* What the person has typed on the account form is remembered, so an error message does not wipe their fields. Passwords stay in memory only. */
  var F = {}, FIELDS = ["ac-name", "ac-class", "ac-email", "ac-pw", "ac-pw2"];
  function restoreForm() {
    FIELDS.forEach(function (id) { var el = document.getElementById(id); if (el && F[id] !== undefined) el.value = F[id]; });
    ["ac-pw", "ac-pw2"].forEach(function (id) { var el = document.getElementById(id); if (el && C.showpw) el.type = "text"; });
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
    if (a === "remsave") {
      if (!DX.reminders) return;
      DX.reminders.save().then(function () { if (DX.toast) DX.toast("Reminder schedule saved."); }).catch(function (e) { if (DX.toast) DX.toast(e.message || "Could not save reminder settings."); }); return;
    } else if (a === "remon") {
      if (!DX.reminders) return;
      DX.reminders.enable().then(function () { if (DX.toast) DX.toast("Study reminders enabled on this device."); }).catch(function (e) { if (DX.toast) DX.toast(e.message || "Could not enable notifications."); }); return;
    } else if (a === "remtest") {
      if (!DX.reminders) return;
      DX.reminders.test().catch(function (e) { if (DX.toast) DX.toast(e.message || "Could not send a test notification."); }); return;
    } else if (a === "remoff") {
      if (!DX.reminders) return;
      DX.reminders.disable().then(function () { if (DX.toast) DX.toast("Study reminders turned off on this device."); }).catch(function (e) { if (DX.toast) DX.toast(e.message || "Could not turn off notifications."); }); return;
    }
    if (a === "showpw") {
      C.showpw = !C.showpw;
      ["ac-pw", "ac-pw2"].forEach(function (id) { var el = document.getElementById(id); if (el) el.type = C.showpw ? "text" : "password"; });
      b.textContent = C.showpw ? "Hide password" : "Show password"; b.setAttribute("aria-pressed", String(!!C.showpw)); return;
    }
    if (a === "swap") { C.mode = C.mode === "up" ? "in" : "up"; C.err = ""; C.msg = ""; F = { "ac-email": F["ac-email"] }; repaint(); }
    else if (a === "signin") {
      if (!val("ac-email") || !val("ac-pw")) { C.err = "Enter your email and password."; return repaint(); }
      run(C.sb.auth.signInWithPassword({ email: val("ac-email"), password: val("ac-pw") }));
    } else if (a === "signup") {
      if (val("ac-name").length < 2) { C.err = "Enter the name to show on the leaderboard."; return repaint(); }
      if (!val("ac-class")) { C.err = "Choose your class."; return repaint(); }
      if (!val("ac-email") || val("ac-pw").length < 6) { C.err = "Enter your email and a password of at least 6 characters."; return repaint(); }
      run(C.sb.auth.signUp({ email: val("ac-email"), password: val("ac-pw"), options: { emailRedirectTo: location.origin + location.pathname, data: { display_name: val("ac-name"), class_id: val("ac-class") } } }), function (r) {
        if (!r.data.session) C.msg = "Account created. Check your email for a confirmation link, then sign in.";
      });
    } else if (a === "signout") { run(C.sb.auth.signOut(), function () { C.profile = null; C.user = null; }); }
    else if (a === "psave") {
      if (val("ac-name").length < 2) { C.err = "Enter a name of at least 2 characters."; return repaint(); }
      run(C.sb.from("profiles").update({ display_name: val("ac-name"), class_id: val("ac-class") || null }).eq("id", C.user.id), function () {
        C.profile.display_name = val("ac-name"); C.profile.class_id = val("ac-class") || null; C.msg = "Saved."; F = {};
      });
    } else if (a === "rclose") {
      var qid = b.getAttribute("data-id"), st = b.getAttribute("data-v");
      run(C.sb.from("question_reports").update({ status: st }).eq("question_id", qid).eq("status", "open"), function () {
        C.reports.rows = C.reports.rows.filter(function (x) { return x.question_id !== qid; });
        C.msg = "Report closed.";
      });
    } else if (a === "retryacc") { run(loadProfile().then(function () { return loadClasses(); }).then(function () { return flush(); }), null);
    } else if (a === "forgot") { C.mode = "forgot"; C.err = ""; C.msg = ""; repaint();
    } else if (a === "sendreset") {
      var em = val("ac-email"); if (!em) { C.err = "Enter your email."; return repaint(); }
      run(C.sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }), function () {
        C.msg = "If that email has an account, a reset link is on its way. Check your spam folder too.";
      });
    } else if (a === "newpw") {
      if (val("ac-pw").length < 6) { C.err = "Use a password of at least 6 characters."; return repaint(); }
      if (val("ac-pw") !== val("ac-pw2")) { C.err = "The two passwords do not match."; return repaint(); }
      run(C.sb.auth.updateUser({ password: val("ac-pw") }), function () { C.mode = "in"; C.msg = "Password changed. You are signed in."; });
    } else if (a === "msearch") {
      C.members.q = val("ms-q"); C.members.cls = val("ms-class"); C.members.confirm = null; C.members.loaded = false; C.members.loading = true; repaint(); loadMembers();
    } else if (a === "msave") {
      var mid = b.getAttribute("data-id"), mnm = val("mn-" + mid), mcl = val("mc-" + mid);
      if (mnm.length < 2) { C.err = "A name needs at least 2 characters."; return repaint(); }
      run(C.sb.from("profiles").update({ display_name: mnm, class_id: mcl || null }).eq("id", mid), function () {
        var row = memberRow(mid); if (row) { row.display_name = mnm; row.class_id = mcl || null; }
        C.msg = "Saved " + mnm + ".";
      });
    } else if (a === "mask") { C.members.confirm = { id: b.getAttribute("data-id"), kind: b.getAttribute("data-kind") }; repaint();
    } else if (a === "mno") { C.members.confirm = null; repaint();
    } else if (a === "myes") {
      var yid = b.getAttribute("data-id"), kind = b.getAttribute("data-kind");
      C.members.confirm = null;
      run(C.sb.rpc(kind === "remove" ? "admin_remove_member" : "admin_clear_points", { p_id: yid }), function () {
        if (kind === "remove") C.members.rows = C.members.rows.filter(function (x) { return x.user_id !== yid; });
        else { var r2 = memberRow(yid); if (r2) { r2.points = 0; r2.answers_total = 0; } }
        C.msg = kind === "remove" ? "Member removed." : "Scores reset.";
      });
    } else if (a === "qsync") {
      var ids = DX.questions.map(function (x) { return String(x.id); });
      run(C.sb.rpc("sync_question_ids", { p_ids: ids }), function (r) {
        C.msg = "Synced. " + (r && typeof r.data === "number" ? r.data : ids.length) + " questions are now counted on the leaderboards.";
      });
    } else if (a === "clsave") {
      var id = b.getAttribute("data-id"), nm = val("cn-" + id), lv = val("cl-" + id).toUpperCase();
      if (!/^[0-9A-Z ]{2,8}$/.test(lv)) { C.err = "Write the level like 300L."; return repaint(); }
      run(C.sb.from("classes").update({ name: nm, level: lv }).eq("id", id), function () {
        DX.curriculum.classes.forEach(function (k) { if (k.id === id) { k.name = nm; k.level = lv; } });
        C.msg = "Class saved.";
      });
    }
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !e.target || !e.target.id) return;
    var map = { "ms-q": "msearch", "ac-pw": null };
    if (e.target.id === "ms-q") { var bt = document.querySelector('[data-act="msearch"]'); if (bt) bt.click(); }
  });
  DX.account = { render: function (a) { app = a; C.app = a; a.innerHTML = accountView(); restoreForm(); if (C.ok && C.user) { if (DX.reminders) DX.reminders.load(); loadMyTFStats(); loadMyAnalytics(); } if (C.ok && C.user && C.profile && C.profile.is_admin) { if (!C.reports.loaded) loadReports(); if (!C.members.loaded && !C.members.loading) { C.members.loading = true; loadMembers(); } } }, onClick: accountClick, onKey: function () { }, onInput: function (e) { var id = e.target && e.target.id; if (id && FIELDS.indexOf(id) >= 0) F[id] = e.target.value; }, leave: function () { C.reports.loaded = false; C.members.loaded = false; if (C.mode === "forgot") C.mode = "in"; } };

  /* ---------- leaderboards ---------- */
  function loadBoard() {
    var B = C.board; B.error = "";
    Promise.all([C.sb.rpc("student_leaderboard", { p_days: B.days, p_class: B.cls || null }), C.sb.rpc("class_leaderboard", { p_days: B.days })]).then(function (r) {
      var er = r[0].error || r[1].error;
      if (er) { B.error = C.isDown(er) ? DOWN : "Could not load the leaderboards. If this is the first time, the database setup may not have been run."; B.down = C.isDown(er); } else B.down = false;
      B.students = r[0].data || []; B.classes = r[1].data || []; B.loaded = true; repaint();
    }).catch(function () { B.error = DOWN; B.down = true; B.loaded = true; repaint(); });
  }
  function boardView() {
    var B = C.board;
    if (!C.ok) return '<div class="wrap stack"><h1>Leaderboards</h1><p class="lede">Leaderboards could not load. Check your connection and refresh.</p></div>';
    if (!C.user) return '<div class="wrap stack"><header><p class="eyebrow">Leaderboards</p><h1>Sign in to see the leaderboards</h1><p class="lede">Create a free account, pick your class, and your practice counts for it.</p></header><a class="btn primary" href="#account" style="text-decoration:none;align-self:flex-start">Sign in or create an account</a></div>';
    var periods = [[-1, "Today"], [7, "This week"], [30, "This month"], [0, "All time"]].map(function (p) {
      return '<button class="btn small' + (B.days === p[0] ? " primary" : "") + '" data-act="days" data-v="' + p[0] + '">' + p[1] + '</button>';
    }).join("");
    var cls = '<label class="label" for="bd-class">Students from</label><select id="bd-class" data-bd="cls"><option value="">All classes</option>' + DX.curriculum.classes.map(function (c) {
      return '<option value="' + c.id + '"' + (B.cls === c.id ? " selected" : "") + '>' + esc(c.label + (c.name ? " · " + c.name : "")) + '</option>';
    }).join("") + '</select>';
    var rows = function (list, fn) { return list.length ? list.map(fn).join("") : '<p class="muted">Nothing here yet. Answer some practice questions to get on the board.</p>'; };
    var cl = rows(B.classes, function (x, i) {
      return '<div class="r' + (i === 0 ? " first" : "") + '"><span class="pos">' + (i + 1) + '</span><span class="nm">' + esc(classLabel(x.class_id)) + ' <span class="muted">· ' + x.players + ' player' + (x.players === 1 ? "" : "s") + '</span></span><span class="pt">' + x.per_player + '</span></div>';
    });
    var st = rows(B.students, function (x, i) {
      return '<div class="r' + (i === 0 ? " first" : "") + '"><span class="pos">' + (i + 1) + '</span><span class="nm">' + esc(x.display_name) + ' <span class="muted">· ' + esc(classLabel(x.class_id)) + '</span></span><span class="pt">' + x.points + '</span></div>';
    });
    return '<div class="wrap stack"><header><p class="eyebrow">Leaderboards</p><h1>Who is drilling</h1><p class="lede">Each different MCQ answered correctly or True/False stem completed with at least 60% correct earns one point. Repeating a question or stem does not add points.</p></header>' +
      '<div class="row tight">' + periods + '</div>' + (B.error ? '<p class="note bad">' + esc(B.error) + '</p>' + (B.down ? '<div class="row tight"><button class="btn small" data-act="retry">Try again</button></div>' : "") : "") +
      '<section class="section"><h2>Classes</h2><p class="hint">Average points per player, so a bigger class has no advantage.</p><div class="rank">' + (B.loaded ? cl : '<p class="muted">Loading…</p>') + '</div></section>' +
      '<section class="section"><h2>Students</h2><div class="field">' + cls + '</div><div class="rank">' + (B.loaded ? st : '<p class="muted">Loading…</p>') + '</div></section></div>';
  }
  DX.board = {
    render: function (a) { app = a; a.innerHTML = boardView(); if (C.ok && C.user && !C.board.loaded) loadBoard(); },
    onClick: function (e) {
      var rt = e.target.closest('[data-act="retry"]'); if (rt) { C.board.loaded = false; C.board.error = ""; repaint(); loadBoard(); return; }
      var b = e.target.closest('[data-act="days"]'); if (!b) return;
      C.board.days = parseInt(b.getAttribute("data-v"), 10); C.board.loaded = false; repaint(); loadBoard();
    },
    onInput: function (e) { if (e.target.getAttribute("data-bd") === "cls") { C.board.cls = e.target.value; C.board.loaded = false; repaint(); loadBoard(); } },
    leave: function () { C.board.loaded = false; },
    onKey: function () { }
  };
})();
