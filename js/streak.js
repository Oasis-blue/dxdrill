/* Daily streak and small cheering toasts. Kept on this device only (localStorage), counted by the Lagos calendar day.
   A day counts once at least DAY_MIN questions have been finished in practice or Spotter that day. Nothing here is sent anywhere. */
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
    return '<div class="streakchip' + (i.count > 0 ? " on" : "") + '" id="streakchip"><span class="sk-ico" aria-hidden="true">' + (i.count > 0 ? "🔥" : "○") + '</span><span class="sk-main">' + line + '</span><small>Best ' + (i.best || 0) + '</small></div>';
  };

  /* True/false statements count toward the daily streak; signed-in stem results sync separately for admin stats and leaderboards. */
  DX.streakTick = function (count) {
    count = Math.max(0, Number(count) || 0);
    if (!count) return;
    var s = load(), t = today(), msg = "";
    if (s.d !== t) { s.d = t; s.n = 0; }
    s.n += count;
    if (s.last !== t && s.n >= DAY_MIN) {
      s.c = (s.last === yesterday()) ? (s.c || 0) + 1 : 1;
      s.last = t;
      if (s.c > (s.best || 0)) s.best = s.c;
      msg = s.c === 1 ? "Streak started. Come back tomorrow to keep it going." :
        ([3, 7, 14, 30, 60, 100].indexOf(s.c) > -1 ? s.c + " days in a row. Well done." : s.c + "-day streak. See you tomorrow.");
    }
    S.set(KEY, s);
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

      var s = load(), t = today();
      if (s.d !== t) { s.d = t; s.n = 0; }
      s.n += items.length;
      if (s.last !== t && s.n >= DAY_MIN) {
        s.c = (s.last === yesterday()) ? (s.c || 0) + 1 : 1;
        s.last = t; if (s.c > (s.best || 0)) s.best = s.c;
        if (s.c === 1) msgs.push("Streak started. Come back tomorrow to keep it going.");
        else if ([3, 7, 14, 30, 60, 100].indexOf(s.c) > -1) msgs.push(s.c + " days in a row. Well done.");
        else msgs.push(s.c + "-day streak. See you tomorrow.");
      }
      S.set(KEY, s);

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
