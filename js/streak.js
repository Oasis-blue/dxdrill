/* Daily streak and small cheering toasts. Local-first, counted by the Lagos calendar day.
   A day counts once at least DAY_MIN questions have been finished in practice or Spotter that day. Qualifying dates sync to the account when signed in and online. */
(function () {
  var DX = window.DX, S = DX.store, esc = DX.esc;
  var DAY_MIN = 5, KEY = "dx.streak", TDONE = "dx.topicdone";

  function dayStr(ms) { return new Date(ms + 3600000).toISOString().slice(0, 10); }   /* Lagos is UTC+1, no daylight saving */
  function today() { return dayStr(Date.now()); }
  function yesterday() { return dayStr(Date.now() - 86400000); }
  function load() { var s = S.get(KEY, null); if (!s || typeof s !== "object") s = { c: 0, last: "", best: 0, d: "", n: 0 };
    if (!Array.isArray(s.days)) {
      s.days = [];
      if (s.last && s.c > 0) {
        for (var i = Math.max(0, s.c - 1); i >= 0; i--) {
          var dt = new Date(s.last + "T12:00:00Z"); dt.setUTCDate(dt.getUTCDate() - i);
          s.days.push(dt.toISOString().slice(0, 10));
        }
      }
    }
    return s; }

  /* What the home page shows: the streak as it stands right now (a missed day resets it to zero). */
  DX.streakInfo = function () {
    var s = load(), t = today(), y = yesterday();
    var n = s.d === t ? s.n : 0;
    var alive = s.last === t || s.last === y;
    return { count: alive ? s.c : 0, doneToday: s.last === t, left: Math.max(1, DAY_MIN - n), best: s.best || 0, any: !!s.last };
  };
  DX.streakHtml = function () {
    var i = DX.streakInfo(), line;
    if (i.doneToday) line = "<b>" + i.count + "-day streak</b> · done for today";
    else if (i.count > 0) line = "<b>" + i.count + "-day streak</b> · " + i.left + " " + (i.left === 1 ? "question" : "questions") + " left today";
    else line = i.any ? "Streak ended · " + i.left + (i.left === 1 ? " question" : " questions") + " to restart" : "Answer " + DAY_MIN + " questions today to start a streak";
    return '<div class="streakchip' + (i.count > 0 ? " on" : "") + '" id="streakchip"><span class="sk-ico" aria-hidden="true">' + (i.count > 0 ? "🔥" : "○") + '</span><span class="sk-main">' + line + '</span><small>Best ' + (i.best || 0) + '</small></div><section class="sk-panel" id="streak-calendar" aria-label="Study streak calendar and milestones"></section>';
  };

  /* Student achievements: transparent milestones calculated from this device's saved MCQ history and streak. */
  var ACHIEVEMENTS = [
    { id: "first", title: "First Steps", detail: "Answer your first question correctly", test: function (x) { return x.correct >= 1; }, goal: 1, value: function (x) { return x.correct; } },
    { id: "ten", title: "Building Momentum", detail: "Get 10 questions correct", test: function (x) { return x.correct >= 10; }, goal: 10, value: function (x) { return x.correct; } },
    { id: "fifty", title: "Committed Learner", detail: "Get 50 questions correct", test: function (x) { return x.correct >= 50; }, goal: 50, value: function (x) { return x.correct; } },
    { id: "hundred", title: "Century Club", detail: "Get 100 questions correct", test: function (x) { return x.correct >= 100; }, goal: 100, value: function (x) { return x.correct; } },
    { id: "streak3", title: "Three-Day Streak", detail: "Build a 3-day study streak", test: function (x) { return x.best >= 3; }, goal: 3, value: function (x) { return x.best; } },
    { id: "streak7", title: "Week of Consistency", detail: "Build a 7-day study streak", test: function (x) { return x.best >= 7; }, goal: 7, value: function (x) { return x.best; } },
    { id: "streak30", title: "Month of Momentum", detail: "Build a 30-day study streak", test: function (x) { return x.best >= 30; }, goal: 30, value: function (x) { return x.best; } },
    { id: "explorer5", title: "Curious Explorer", detail: "Practise questions in 5 topics", test: function (x) { return x.topics >= 5; }, goal: 5, value: function (x) { return x.topics; } },
    { id: "explorer10", title: "Wide-Ranging Learner", detail: "Practise questions in 10 topics", test: function (x) { return x.topics >= 10; }, goal: 10, value: function (x) { return x.topics; } }
  ];
  function achievementStats() {
    var st = DX.stats(), correct = 0, attempted = 0, topics = {}, topicByQuestion = {};
    (DX.questions || []).forEach(function (q) { topicByQuestion[String(q.id)] = q.topic; });
    Object.keys(st || {}).forEach(function (id) {
      var row = st[id] || {}, n = Math.max(0, Number(row.n) || 0), c = Math.max(0, Number(row.c) || 0);
      attempted += n; correct += c;
      if (n && topicByQuestion[id]) topics[topicByQuestion[id]] = 1;
    });
    var si = DX.streakInfo();
    return { correct: correct, attempted: attempted, topics: Object.keys(topics).length, best: si.best || 0, current: si.count || 0 };
  }
  function achievementHtml() {
    var x = achievementStats(), unlocked = ACHIEVEMENTS.filter(function (a) { return a.test(x); }).length;
    var cards = ACHIEVEMENTS.map(function (a) {
      var yes = a.test(x), progress = Math.min(100, Math.round(a.value(x) / a.goal * 100));
      return '<article class="ach-card' + (yes ? ' earned' : '') + '"><span class="ach-icon" aria-hidden="true">' + (yes ? '★' : '◇') + '</span><div><b>' + esc(a.title) + '</b><p>' + esc(a.detail) + '</p><small>' + (yes ? 'Unlocked' : Math.min(a.value(x), a.goal) + ' / ' + a.goal) + '</small><div class="ach-track"><i style="width:' + progress + '%"></i></div></div></article>';
    }).join("");
    return '<section class="achievements" id="dx-achievements"><div class="ach-head"><div><p class="eyebrow">Your milestones</p><h2>Achievements</h2><p class="hint">' + unlocked + ' of ' + ACHIEVEMENTS.length + ' unlocked · ' + x.correct + ' correct · ' + x.topics + ' topics explored</p></div><button type="button" class="btn small primary" data-ach-share="1">Share progress card</button></div><div class="ach-grid">' + cards + '</div><p class="ach-foot">Achievements use practice history saved on this device. Your synced streak is shown separately.</p></section>';
  }
  function shareAchievement() {
    var x = achievementStats(), unlocked = ACHIEVEMENTS.filter(function (a) { return a.test(x); });
    var text = 'My DxDrill progress: ' + x.correct + ' correct answers across ' + x.topics + ' topics, with a ' + x.best + '-day personal-best study streak. ' + unlocked.length + '/' + ACHIEVEMENTS.length + ' achievements unlocked. Keep learning with DxDrill!';
    var canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 630;
    var ctx = canvas.getContext("2d");
    if (!ctx) { shareText(text); return; }
    ctx.fillStyle = "#0d202b"; ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = "#4cc3e0"; ctx.fillRect(72, 72, 12, 486);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 38px Arial"; ctx.fillText("DxDrill", 120, 125);
    ctx.fillStyle = "#a9c0ca"; ctx.font = "24px Arial"; ctx.fillText("MY LEARNING MILESTONES", 120, 190);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 72px Arial"; ctx.fillText(x.correct.toLocaleString() + " correct answers", 120, 300);
    ctx.font = "34px Arial"; ctx.fillStyle = "#dce9ee";
    ctx.fillText(x.topics + " topics explored", 120, 385);
    ctx.fillText(x.best + "-day personal-best streak", 120, 445);
    ctx.fillStyle = "#4cc3e0"; ctx.font = "bold 26px Arial"; ctx.fillText(unlocked.length + " / " + ACHIEVEMENTS.length + " achievements unlocked", 120, 525);
    ctx.fillStyle = "#a9c0ca"; ctx.font = "20px Arial"; ctx.fillText("Keep learning. Keep improving.", 120, 575);
    canvas.toBlob(function (blob) {
      if (!blob) { shareText(text); return; }
      var file;
      try { file = new File([blob], "dxdrill-achievement.png", { type: "image/png" }); } catch (e) { shareText(text); return; }
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "My DxDrill achievements", text: text }).catch(function () { shareText(text); });
      } else shareText(text);
    }, "image/png");
  }
  function shareText(text) {
    if (navigator.share) navigator.share({ title: "My DxDrill progress", text: text }).catch(function () { copyText(text); });
    else copyText(text);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { DX.toast("Progress summary copied."); }, function () { DX.toast(text); });
    else DX.toast(text);
  }
  /* Home streak experience: a browsable Lagos-calendar month and lifetime milestones. */
  var streakMonth = new Date(Date.now() + 3600000);
  streakMonth = new Date(Date.UTC(streakMonth.getUTCFullYear(), streakMonth.getUTCMonth(), 1));
  var STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
  function dateKey(y, m, d) { return new Date(Date.UTC(y, m, d, 12)).toISOString().slice(0, 10); }
  function monthLabel(y, m) { return new Date(Date.UTC(y, m, 1, 12)).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" }); }
  function renderStreakCalendar() {
    var root = document.getElementById("streak-calendar");
    if (!root) return;
    var s = load(), info = DX.streakInfo(), y = streakMonth.getUTCFullYear(), m = streakMonth.getUTCMonth();
    var first = new Date(Date.UTC(y, m, 1)).getUTCDay(), total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var todayKey = today(), qualified = Object.create(null);
    s.days.forEach(function (d) { if (/^\d{4}-\d{2}-\d{2}$/.test(d)) qualified[d] = true; });
    var cells = "";
    for (var blank = 0; blank < first; blank++) cells += '<span class="sk-day empty" aria-hidden="true"></span>';
    for (var day = 1; day <= total; day++) {
      var key = dateKey(y, m, day), future = key > todayKey, done = !!qualified[key];
      cells += '<span class="sk-day' + (done ? ' qualified' : '') + (key === todayKey ? ' today' : '') + (future ? ' future' : '') + '"' +
        (done ? ' aria-label="' + key + ', qualifying study day"' : ' aria-label="' + key + (future ? ', future' : '') + '"') + '>' + day + (done ? '<i aria-hidden="true">✓</i>' : '') + '</span>';
    }
    var next = STREAK_MILESTONES.filter(function (n) { return n > info.best; })[0] || null;
    var progress = next ? Math.min(100, Math.round(Math.max(info.count, info.best) / next * 100)) : 100;
    var milestones = STREAK_MILESTONES.map(function (n) {
      var unlocked = info.best >= n;
      return '<span class="sk-milestone' + (unlocked ? ' unlocked' : '') + '"><b>' + n + '</b><small>' + (unlocked ? 'Reached' : 'days') + '</small></span>';
    }).join("");
    root.innerHTML =
      '<div class="sk-cal-head"><div><h2>Study streak</h2><p class="hint">One qualifying day = ' + DAY_MIN + ' completed questions</p></div>' +
      '<div class="sk-stats"><span><b>' + info.count + '</b><small>Current</small></span><span><b>' + info.best + '</b><small>Personal best</small></span></div></div>' +
      '<div class="sk-month"><button type="button" class="btn ghost small" data-sk-month="-1" aria-label="Previous month">‹</button><b>' + monthLabel(y, m) + '</b><button type="button" class="btn ghost small" data-sk-month="1" aria-label="Next month"' + (y === new Date(Date.now() + 3600000).getUTCFullYear() && m === new Date(Date.now() + 3600000).getUTCMonth() ? ' disabled' : '') + '>›</button></div>' +
      '<div class="sk-weekdays" aria-hidden="true">' + ["S","M","T","W","T","F","S"].map(function (x) { return '<span>' + x + '</span>'; }).join("") + '</div>' +
      '<div class="sk-days">' + cells + '</div><p class="sk-legend"><i></i> Qualifying study day</p>' +
      '<div class="sk-next"><div class="sk-next-line"><b>' + (next ? next + '-day milestone' : 'All milestones reached') + '</b><span>' + (next ? Math.max(0, next - Math.max(info.count, info.best)) + ' to go' : '100+ days') + '</span></div><div class="sk-progress"><i style="width:' + progress + '%"></i></div></div>' +
      '<div class="sk-milestones">' + milestones + '</div>' + achievementHtml();
  }
  DX.mountStreakPanel = function () {
    renderStreakCalendar();
    var root = document.getElementById("streak-calendar");
    if (!root || root.getAttribute("data-bound")) return;
    root.setAttribute("data-bound", "1");
    root.addEventListener("click", function (e) {
      var share = e.target.closest("[data-ach-share]");
      if (share) { shareAchievement(); return; }
      var btn = e.target.closest("[data-sk-month]");
      if (!btn || btn.disabled) return;
      streakMonth.setUTCMonth(streakMonth.getUTCMonth() + Number(btn.getAttribute("data-sk-month")));
      renderStreakCalendar();
    });
  };
  DX.refreshStreakPanel = renderStreakCalendar;

  /* True/false statements count toward the daily streak; signed-in stem results sync separately for admin stats and leaderboards. */
  DX.streakTick = function (count) {
    count = Math.max(0, Number(count) || 0);
    if (!count) return;
    var s = load(), t = today(), msg = "", streakJustCompleted = false;
    if (s.d !== t) { s.d = t; s.n = 0; }
    s.n += count;
    if (s.last !== t && s.n >= DAY_MIN) {
      s.c = (s.last === yesterday()) ? (s.c || 0) + 1 : 1;
      s.last = t;
      streakJustCompleted = true;
      if (s.c > (s.best || 0)) s.best = s.c;
      msg = s.c === 1 ? "Streak started. Come back tomorrow to keep it going." :
        ([3, 7, 14, 30, 60, 100].indexOf(s.c) > -1 ? s.c + " days in a row. Well done." : s.c + "-day streak. See you tomorrow.");
    }
    if (streakJustCompleted && s.days.indexOf(t) < 0) s.days.push(t);
    S.set(KEY, s);
    if (streakJustCompleted && DX.cloud && DX.cloud.syncStreak) DX.cloud.syncStreak();
    if (msg) setTimeout(function () { DX.toast(msg); }, 700);
  };

  /* Toasts: one at a time, polite for screen readers, never blocks a tap. */
  var queue = [], showing = false;
  DX.toast = function (msg, kind) {
    queue.push({ message: String(msg), kind: kind === "loading" || kind === "success" ? kind : "" });
    if (!showing) next();
  };
  function next() {
    var item = queue.shift();
    if (!item) { showing = false; return; }
    showing = true;
    var d = document.createElement("div");
    d.className = "dxtoast" + (item.kind ? " dxtoast--" + item.kind : "");
    d.setAttribute("role", "status");
    if (item.kind) {
      var icon = document.createElement("span");
      icon.className = "dxtoast__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = item.kind === "success" ? "✓" : "";
      var copy = document.createElement("span");
      copy.className = "dxtoast__copy";
      var title = document.createElement("strong");
      title.className = "dxtoast__title";
      title.textContent = item.kind === "loading" ? "Loading more questions" : "Question bank ready";
      var detail = document.createElement("span");
      detail.className = "dxtoast__detail";
      detail.textContent = item.message;
      copy.appendChild(title);
      copy.appendChild(detail);
      d.appendChild(icon);
      d.appendChild(copy);
    } else {
      d.textContent = item.message;
    }
    /* Use a reserved in-flow notification area between navigation and page content. */
    var region = document.getElementById("toast-region");
    (region || document.body).appendChild(d);
    setTimeout(function () { d.classList.add("out"); }, 3600);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); next(); }, 4000);
  }

  /* Share of each topic's questions answered on this device, from the per-question history. */
  function finishedTopics() {
    var st = DX.stats(), tot = {}, got = {}, out = {};
    (DX.questions || []).forEach(function (q) {
      tot[q.topic] = (tot[q.topic] || 0) + 1;
      if (st[q.id] && st[q.id].n) got[q.topic] = (got[q.topic] || 0) + 1;
    });
    for (var t in tot) if (tot.hasOwnProperty(t) && tot[t] >= 10 && (got[t] || 0) / tot[t] >= 0.8) out[t] = 1;
    return out;
  }

  var orig = DX.record;
  DX.record = function (items) {
    var msgs = [], saved = false;
    try {
      /* Topics already finished before this batch are remembered silently the first time, so nobody gets old news as a toast. */
      var seen = S.get(TDONE, null), first = !seen;
      if (first) seen = finishedTopics();
      orig(items); saved = true;

      var s = load(), t = today(), streakJustCompleted = false;
      if (s.d !== t) { s.d = t; s.n = 0; }
      s.n += items.length;
      if (s.last !== t && s.n >= DAY_MIN) {
        s.c = (s.last === yesterday()) ? (s.c || 0) + 1 : 1;
        s.last = t; streakJustCompleted = true; if (s.c > (s.best || 0)) s.best = s.c;
        if (s.c === 1) msgs.push("Streak started. Come back tomorrow to keep it going.");
        else if ([3, 7, 14, 30, 60, 100].indexOf(s.c) > -1) msgs.push(s.c + " days in a row. Well done.");
        else msgs.push(s.c + "-day streak. See you tomorrow.");
      }
      if (streakJustCompleted && s.days.indexOf(t) < 0) s.days.push(t);
      S.set(KEY, s);
      if (streakJustCompleted && DX.cloud && DX.cloud.syncStreak) DX.cloud.syncStreak();

      var run = 0, best = 0;
      items.forEach(function (x) { run = x.ok ? run + 1 : 0; if (run > best) best = run; });
      if (best >= 10) msgs.push(best + " right in a row.");

      var now = finishedTopics(), names = [];
      for (var k in now) if (now.hasOwnProperty(k) && !seen[k]) { seen[k] = 1; var tp = DX.topicById[k]; if (tp && !first) names.push(tp.name); }
      S.set(TDONE, seen);
      if (names.length) msgs.push("Topic finished: " + names[0] + (names.length > 1 ? " (and " + (names.length - 1) + " more)" : ""));
    } catch (e) { /* cheering must never get in the way of saving answers */ }
    if (!saved) orig(items);
    setTimeout(function () { msgs.slice(0, 2).forEach(DX.toast); }, 700);
  };
})();
