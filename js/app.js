/* Router, theme, sound toggle and the home page. */
(function () {
  var DX = window.DX, esc = DX.esc;
  var app = document.getElementById("app");
  var current = null;

  function home() {
    var subs = DX.curriculum.subjects;
    var totalQ = DX.questions.length;
    var totalTopics = 0, doneTopics = 0;
    subs.forEach(function (s) { s.areas.forEach(function (a) { a.topics.forEach(function (t) { totalTopics++; if (t.count) doneTopics++; }); }); });
    var cov = subs.map(function (s) {
      var n = 0, d = 0;
      s.areas.forEach(function (a) { a.topics.forEach(function (t) { n++; if (t.count) d++; }); });
      return '<div><div class="meta"><span>' + esc(s.name) + '</span><span>' + d + ' of ' + n + ' topics · ' + DX.subjectCount(s.id) + ' questions</span></div><div class="meter"><i style="width:' + DX.pct(d, n) + '%"></i></div></div>';
    }).join("");
    app.innerHTML =
      '<div class="wrap wide stack">' +
      '<header class="hero"><p class="eyebrow">For medical students</p>' +
      '<h1>Drill the basics until they <span>stick</span></h1>' +
      '<p class="lede">Practice questions with explanations, and live quiz rounds for the hall. Topics follow the MDCN curriculum, and every question you study here can be added to the bank.</p></header>' +
      (DX.streakHtml ? DX.streakHtml() : '') +
      '<section class="cards">' +
      '<article class="card"><h2>Practice</h2><p>' + (DX.loadingQuestions ? 'Loading the question bank…' : totalQ + ' questions across ' + doneTopics + ' topics.') + ' Study mode explains each answer as you go. Exam mode saves the marks for the end.</p><a class="btn primary" href="#practice" style="text-decoration:none">Start practising</a></article>' +
      '<article class="card"><h2>Hall mode</h2><p>One screen, a quizmaster and teams. Rapid fire, a question board, everyone-answers rounds, describe-it and explain-it.</p><a class="btn" href="#hall" style="text-decoration:none">Open hall mode</a></article>' +
      '</section>' +
      '<section class="section"><h2>Curriculum coverage</h2><p class="muted">' + (DX.loadingQuestions ? 'Loading question coverage…' : doneTopics + ' of ' + totalTopics + ' MDCN topics have questions so far. The rest are waiting to be filled as you study.') + '</p><div class="cov">' + cov + '</div></section>' +
      '</div>';
    homeExtras();
  }

  /* Home extras: a sign-in card for visitors without an account, and real counts. Both appear only when the online part has answered. */
  function countUp(el, to) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || to < 2) { el.textContent = to.toLocaleString(); return; }
    var t0 = Date.now(), dur = 1100;
    (function step() {
      var k = Math.min(1, (Date.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e).toLocaleString();
      if (k < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = to.toLocaleString();
    })();
  }
  function showCounts(s) {
    var hero = app.querySelector(".hero");
    if (!hero || app.querySelector("#homecounts") || !s) return;
    var tiles = [];   /* each number appears only once it is big enough to be worth showing; they are real counts, never padded */
    if (s.members >= 25) tiles.push(["students signed up", s.members]);
    if (s.answers >= 200) tiles.push(["questions answered", s.answers]);
    if (s.answers >= 200 && s.answers_today >= 20) tiles.push(["answered today", s.answers_today]);
    if (!tiles.length) return;
    var sec = document.createElement("section"); sec.id = "homecounts"; sec.className = "section";
    sec.innerHTML = '<div class="statrow">' + tiles.map(function (t) { return '<div class="stat"><b class="statn" data-to="' + t[1] + '">0</b><span>' + esc(t[0]) + '</span></div>'; }).join("") + '</div>';
    hero.parentNode.insertBefore(sec, hero.nextSibling);
    Array.prototype.forEach.call(sec.querySelectorAll(".statn"), function (n) { countUp(n, Number(n.getAttribute("data-to"))); });
  }
  function homeExtras() {
    var c = DX.cloud; if (!c || !c.ok || !c.sb || (location.hash || "#home").slice(1) !== "home" && location.hash !== "") return;
    var hero = app.querySelector(".hero"); if (!hero) return;
    var off = DX.store.get("dx.homecard.off", 0) || 0;
    if (!c.user && !app.querySelector("#homesign") && Date.now() - off > 7 * 86400000) {
      var d = document.createElement("section"); d.id = "homesign"; d.className = "homesign";
      d.innerHTML = '<p><b>Keep your progress.</b> Make a free account to save your practice across phones, join the leaderboards and play live quizzes.</p>' +
        '<div class="row tight"><a class="btn primary small" href="#account" style="text-decoration:none">Sign in or sign up</a><button type="button" class="btn ghost small" data-homeclose="1" aria-label="Hide this">Not now</button></div>';
      d.querySelector("[data-homeclose]").onclick = function () { DX.store.set("dx.homecard.off", Date.now()); d.parentNode.removeChild(d); };
      hero.parentNode.insertBefore(d, hero.nextSibling);
    }
    var cached = null; try { cached = JSON.parse(sessionStorage.getItem("dx.pubstats") || "null"); } catch (e) { }
    if (cached && Date.now() - cached.t < 300000) { showCounts(cached.s); return; }
    c.sb.rpc("public_stats").then(function (r) {
      if (r.error || !r.data || !r.data[0]) return;
      var s = { members: Number(r.data[0].members) || 0, answers: Number(r.data[0].answers) || 0, answers_today: Number(r.data[0].answers_today) || 0 };
      try { sessionStorage.setItem("dx.pubstats", JSON.stringify({ t: Date.now(), s: s })); } catch (e) { }
      if ((location.hash || "#home").slice(1) === "home") showCounts(s);
    }, function () { });
  }

  /* Play: one place for flashcards, challenges and live quizzes. */
  var PLAY = { competitions: "play", live: "play", cards: "play", debates: "play" };
  function playHub(el) {
    var F = DX.features, cards = [
      ["cards", "Flashcards", "Recall the answer before you look. Cards you miss come back soon, and cards you know come back later. Just for you, any time.", "#cards", "Open flashcards", true],
      ["spotter", "Spotter", "A steeplechase of slide pictures. Each station gives you a picture and a question for a fixed time, then moves on by itself. Just for you, any time.", "#spotter", "Start a spotter run", false],
      ["competitions", "Challenges", "A timed, ranked quiz that stays open for a few days. Play whenever suits you, one attempt. Results and class rankings appear when it closes.", "#competitions", "See challenges", false],
      ["live", "Live quiz", "Everyone plays together, right now. Type the code from the host and answer on your phone. Faster right answers score more.", "#live", "Join a live quiz", false],
      ["debates", "Debates", "Take a side on a claim, say why, and react to what your classmates think. Suggest topics too.", "#debates", "Join a debate", false]
    ].filter(function (c) { return c[0] === "spotter" || F.on(c[0]) || (c[0] === "live" && F.on("friends")); });
    el.innerHTML = '<div class="wrap wide stack"><header><p class="eyebrow">Play</p><h1>Ways to play</h1><p class="lede">Study alone, race the whole school over a few days, or join a live quiz with a code.</p></header>' +
      '<section class="cards">' + cards.map(function (c, i) {
        return '<article class="card"><h2>' + c[1] + '</h2>' +  (c[0] === "spotter" || F.visibleToStudents(c[0]) || (c[0] === "live" && F.visibleToStudents("friends")) ? "" : '<p><b>Hidden from students</b></p>') + '<p>' + c[2] + '</p><a class="btn' + (i === 0 ? " primary" : "") + '" href="' + c[3] + '" style="text-decoration:none">' + c[4] + '</a></article>';
      }).join("") + '</section>' + (DX.cloud && DX.cloud.profile && DX.cloud.profile.is_admin ? '<p><a href="#features">Features and visitors: choose what students see, and check who is using DxDrill</a></p>' : "") + '</div>';
  }
  var GATE = { cards: "cards", competitions: "competitions", live: "live", debates: "debates", polls: "polls" };
  var DATA_PAGES = { practice: 1, hall: 1, cards: 1, spotter: 1 };
  function navVisibility() {
    var F = DX.features, polls = document.querySelector('[data-nav="polls"]'), play = document.querySelector('[data-nav="play"]');
    if (polls) polls.hidden = !F.on("polls");
    if (play) play.hidden = !(F.on("cards") || F.on("competitions") || F.on("live") || F.on("friends") || F.on("debates"));
  }
  var routes = {
    home: { render: home },
    play: { render: playHub },
    practice: DX.practice,
    hall: DX.hall,
    board: DX.board,
    polls: DX.polls,
    about: DX.about,
    start: DX.start,
    feedback: DX.feedback,
    competitions: DX.comps,
    live: DX.rooms,
    cards: DX.cards,
    debates: DX.debates,
    features: DX.features,
    account: DX.account,
    screen: DX.screen,
    remote: DX.remote,
    spotter: DX.spotter
  };

  /* A small "back" link above pages that sit one level down. It lives outside #app, so live pages that repaint do not remove it. */
  var BACK = { spotter: ["#play", "Play"], cards: ["#play", "Play"], competitions: ["#play", "Play"], live: ["#play", "Play"], debates: ["#play", "Play"], polls: ["#home", "Home"], board: ["#home", "Home"], account: ["#home", "Home"] };
  function backBar(h) {
    var bar = document.getElementById("backbar"), a = document.getElementById("backlink"), b = BACK[h];
    if (!bar || !a) return;
    if (!b) { bar.hidden = true; return; }
    a.setAttribute("href", b[0]); a.textContent = "\u2190 " + b[1]; bar.hidden = false;
  }
  /* which pages people open: one anonymous note per device, page and day. Admin visits are left out. */
  var lastPing = { h: "", t: 0 };
  function pagePing(h) {
    try {
      var c = DX.cloud; if (!c || !c.ok || !c.sb || (c.profile && c.profile.is_admin) || !routes[h]) return;
      if (lastPing.h === h && Date.now() - lastPing.t < 3000) return;
      lastPing = { h: h, t: Date.now() };
      var dev = DX.store.get("dx.device", "");
      if (!dev) { dev = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); DX.store.set("dx.device", dev); }
      c.sb.rpc("page_ping", { p_device: dev, p_page: h }).then(function () { }, function () { });
    } catch (e) { }
  }
  function route() {
    var h = (location.hash || "#home").slice(1).split(/[?\/]/)[0];
    var bb = document.getElementById("backbar"); if (bb) bb.hidden = true;
    if (!routes[h]) {
      /* A menu page whose file did not load: say so, instead of silently showing Home. */
      if (/^[a-z]+$/.test(h) && document.querySelector('[data-nav="' + (PLAY[h] || h) + '"]')) {
        if (current && current.leave) current.leave();
        current = null;
        document.querySelectorAll("[data-nav]").forEach(function (a) { if (a.getAttribute("data-nav") === (PLAY[h] || h)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
        app.innerHTML = '<div class="wrap stack"><h1>This page did not load</h1><p class="lede">One of the site files is missing or out of date. Reload the page. If you still see this, the file js/' + h + '.js is missing from the site.</p></div>';
        return;
      }
      h = "home";
    }
    if (current && current.leave) current.leave();
    var gate = GATE[h];
    if (gate && !(DX.features.on(gate) || (h === "live" && DX.features.on("friends")))) {
      current = null;
      document.querySelectorAll("[data-nav]").forEach(function (a) { if (a.getAttribute("data-nav") === (PLAY[h] || h)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      app.innerHTML = '<div class="wrap stack"><h1>Coming soon</h1><p class="lede">This is not open yet. Check back soon.</p><a class="btn primary" href="#home" style="text-decoration:none">Back home</a></div>';
      navVisibility(); return;
    }
    if ((h === "practice" && !DX.questionsReady) || (h !== "practice" && DX.loadingQuestions && DATA_PAGES[h])) {
      current = null;
      app.innerHTML = '<div class="wrap stack"><p class="lede" role="status"><i class="spin"></i>Loading the question bank…</p><p class="muted">The homepage is ready. Some question files are still downloading. Practice will open as soon as the first usable questions are ready.</p></div>';
      return;
    }
    navVisibility();
    current = routes[h]; backBar(h); pagePing(h);
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === (PLAY[h] || h)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    current.render(app);
    window.scrollTo(0, 0);
    if (DX.tips) DX.tips.page(h);
  }

  app.addEventListener("click", function (e) { if (current && current.onClick) current.onClick(e); });
  /* Clicking the link of the page you are already on returns that page to its start (practice only). */
  document.querySelector(".nav").addEventListener("click", function (e) {
    var a = e.target.closest("[data-nav]");
    if (!a) return;
    var h = (location.hash || "#home").slice(1);
    if (a.getAttribute("data-nav") === h && current && current.reset) { current.reset(); route(); }
  });
  app.addEventListener("input", function (e) { if (current && current.onInput) current.onInput(e); });
  app.addEventListener("change", function (e) { if (current && current.onInput) current.onInput(e); });
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (current && current.onKey) current.onKey(e);
  });

  /* theme: auto -> light -> dark */
  var themeBtn = document.getElementById("btn-theme");
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
    themeBtn.textContent = t === "light" ? "Light" : t === "dark" ? "Dark" : "Auto theme";
  }
  var theme = DX.store.get("dx.theme", "auto");
  applyTheme(theme);
  themeBtn.addEventListener("click", function () {
    theme = theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
    DX.store.set("dx.theme", theme); applyTheme(theme);
  });

  /* sound */
  var soundBtn = document.getElementById("btn-sound");
  DX.sound = DX.store.get("dx.sound", true);
  function paintSound() {
    soundBtn.textContent = DX.sound ? "Sound on" : "Sound off";
    soundBtn.setAttribute("aria-pressed", DX.sound ? "true" : "false");
  }
  paintSound();
  soundBtn.addEventListener("click", function () { DX.sound = !DX.sound; DX.store.set("dx.sound", DX.sound); paintSound(); });

  /* install to home screen + offline support */
  var installBtn = document.getElementById("btn-install"), installEv = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEv = e; installBtn.hidden = false; });
  installBtn.addEventListener("click", function () {
    if (!installEv) return;
    installEv.prompt();
    installEv.userChoice.then(function () { installEv = null; installBtn.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { installBtn.hidden = true; });
  /* When a newer version of the site takes over while a page is open, say so. */
  if ("serviceWorker" in navigator) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController || document.getElementById("updbar")) { hadController = true; return; }
      var d = document.createElement("div"); d.id = "updbar"; d.setAttribute("role", "status");
      d.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--accent,#0b6b5a);color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;font-size:15px";
      d.innerHTML = '<span>A new version of DxDrill is ready.</span><span><button type="button" style="border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:600;background:#fff;color:#111" id="updgo">Reload</button> <button type="button" aria-label="Dismiss" style="border:0;background:transparent;color:inherit;font:inherit;padding:8px" id="updno">\u2715</button></span>';
      document.body.appendChild(d);
      document.getElementById("updgo").onclick = function () { location.reload(); };
      document.getElementById("updno").onclick = function () { d.remove(); };
    });
  }
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { /* works without it */ }); });
  }

  DX.features.onChange = function () {   /* only redraw pages the switches affect, never a page someone is working in */
    navVisibility();
    var h = (location.hash || "#home").slice(1);
    if (h === "play" || h === "features" || GATE[h]) route();
  };
  window.addEventListener("hashchange", route);
  var loaded = false, nTimer = null;
  function nuggetHtml() { return DX.nugget ? '<p class="nugget"><b>Did you know?</b> <span id="nugtext">' + esc(DX.nugget()) + '</span></p>' : ""; }
  app.innerHTML = '<div class="wrap stack"><p class="muted" role="status"><i class="spin"></i>Loading questions…</p>' + nuggetHtml() + '</div>';
  nTimer = setInterval(function () { var t = document.getElementById("nugtext"); if (loaded || !t) { clearInterval(nTimer); return; } t.textContent = DX.nugget(); }, 7000);
  function retryBox(title, text) {
    app.innerHTML = '<div class="wrap stack"><h1>' + esc(title) + '</h1><p class="lede">' + esc(text) + '</p><div class="row"><button class="btn primary" id="ld-retry" type="button">Try again</button><a class="btn" href="help.html" style="text-decoration:none">Check my connection</a></div>' + nuggetHtml() + '</div>';
    var b = document.getElementById("ld-retry"); if (b) b.onclick = function () { location.reload(); };
  }
  setTimeout(function () { if (!loaded) retryBox("Still loading…", "Your connection looks slow. Wait a little longer, or tap Try again. Nothing has been lost: your scores are saved on this phone."); }, 9000);
  DX.onQuestionsReady = function () {
    var h = (location.hash || "#home").slice(1);
    if (h === "practice") route();
  };
  DX.onQuestionsProgress = function () {
    var h = (location.hash || "#home").slice(1);
    if (h === "practice" && DX.practice && DX.practice.needsDataRefresh && DX.practice.needsDataRefresh()) {
      var y = window.scrollY;
      route();
      window.scrollTo(0, y);
    }
  };
  DX.load().then(function () {
    loaded = true; clearInterval(nTimer);
    if (DX.partial && DX.toast) DX.toast("You can keep exploring while we finish.", "loading");
    DX.onMore = function () {
      if (DX.toast) DX.toast("All questions have loaded successfully.", "success");
      var h = (location.hash || "#home").slice(1);
      if (h === "home" || h === "") route();
      else if (DATA_PAGES[h]) route();
    };
    /* Pages that need the account check wait for it; everything else shows at once. */
    var CLOUDY = { screen: 1, remote: 1, board: 1, account: 1, polls: 1, feedback: 1, live: 1, debates: 1, competitions: 1, features: 1 };
    var h0 = (location.hash || "#home").slice(1), waits = !!CLOUDY[h0];
    var initP = Promise.resolve().then(function () { return DX.cloud.init(); }).catch(function () { });
    var timedOut = false, capped = Promise.race([initP, new Promise(function (r) { setTimeout(function () { timedOut = true; r(); }, 4000); })]);
    if (waits) app.innerHTML = '<div class="wrap stack"><p class="lede">Loading\u2026</p></div>'; else route();
    function after() {
      try {   /* anonymous daily visit note: a random device id, no name, no cookie */
        var c = DX.cloud, adm = c && c.profile && c.profile.is_admin;
        if (c && c.ok && c.sb && !adm) {
          var dev = DX.store.get("dx.device", "");
          if (!dev) { dev = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); DX.store.set("dx.device", dev); }
          c.sb.rpc("visit_ping", { p_device: dev, p_page: (location.hash || "#home").slice(1, 25), p_signed: !!c.user }).then(function () { }, function () { });
        }
      } catch (e) { }
      try { navVisibility(); } catch (e) { }
      var h = (location.hash || "#home").slice(1);
      if (waits || h === "home" || h === "" || h === "play" || CLOUDY[h] || GATE[h]) route();
    }
    capped.then(after, after);
    initP.then(function () { var h = (location.hash || "#home").slice(1); if (timedOut && CLOUDY[h] && DX.cloud && DX.cloud.ok) route(); });
    /* Once the profile has loaded, pages that show admin or member features need a fresh draw (Account and Leaderboards redraw themselves). */
    initP.then(function () { return DX.cloud.loading; }).then(function () {
      var h = (location.hash || "#home").slice(1);
      if (DX.cloud && DX.cloud.user && CLOUDY[h] && h !== "account" && h !== "board") route();
    });
  }).catch(function (e) {
    loaded = true; clearInterval(nTimer);
    retryBox("Could not load the questions", "DxDrill could not reach its question files. Check your connection and tap Try again. Your scores are saved on this phone. (" + (e && e.message ? e.message : "network error") + ")");
  });
})();
