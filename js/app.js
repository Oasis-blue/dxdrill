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
      '<section class="cards">' +
      '<article class="card"><h2>Practice</h2><p>' + totalQ + ' questions across ' + doneTopics + ' topics. Study mode explains each answer as you go. Exam mode saves the marks for the end.</p><a class="btn primary" href="#practice" style="text-decoration:none">Start practising</a></article>' +
      '<article class="card"><h2>Hall mode</h2><p>One screen, a quizmaster and teams. Rapid fire, a question board, everyone-answers rounds, describe-it and explain-it.</p><a class="btn" href="#hall" style="text-decoration:none">Open hall mode</a></article>' +
      '</section>' +
      '<section class="section"><h2>Curriculum coverage</h2><p class="muted">' + doneTopics + ' of ' + totalTopics + ' MDCN topics have questions so far. The rest are waiting to be filled as you study.</p><div class="cov">' + cov + '</div></section>' +
      '</div>';
  }

  /* Play: one place for flashcards, challenges and live quizzes. */
  var PLAY = { competitions: "play", live: "play", cards: "play", debates: "play" };
  function playHub(el) {
    var F = DX.features, cards = [
      ["cards", "Flashcards", "Recall the answer before you look. Cards you miss come back soon, and cards you know come back later. Just for you, any time.", "#cards", "Open flashcards", true],
      ["competitions", "Challenges", "A timed, ranked quiz that stays open for a few days. Play whenever suits you, one attempt. Results and class rankings appear when it closes.", "#competitions", "See challenges", false],
      ["live", "Live quiz", "Everyone plays together, right now. Type the code from the host and answer on your phone. Faster right answers score more.", "#live", "Join a live quiz", false],
      ["debates", "Debates", "Take a side on a claim, say why, and react to what your classmates think. Suggest topics too.", "#debates", "Join a debate", false]
    ].filter(function (c) { return F.on(c[0]) || (c[0] === "live" && F.on("friends")); });
    el.innerHTML = '<div class="wrap wide stack"><header><p class="eyebrow">Play</p><h1>Ways to play</h1><p class="lede">Study alone, race the whole school over a few days, or join a live quiz with a code.</p></header>' +
      '<section class="cards">' + cards.map(function (c, i) {
        return '<article class="card"><h2>' + c[1] + '</h2>' + (F.visibleToStudents(c[0]) || (c[0] === "live" && F.visibleToStudents("friends")) ? "" : '<p><b>Hidden from students</b></p>') + '<p>' + c[2] + '</p><a class="btn' + (i === 0 ? " primary" : "") + '" href="' + c[3] + '" style="text-decoration:none">' + c[4] + '</a></article>';
      }).join("") + '</section>' + (DX.cloud && DX.cloud.profile && DX.cloud.profile.is_admin ? '<p><a href="#features">Manage which features students can see</a></p>' : "") + '</div>';
  }
  var GATE = { cards: "cards", competitions: "competitions", live: "live", debates: "debates", polls: "polls" };
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
    account: DX.account
  };

  function route() {
    var h = (location.hash || "#home").slice(1);
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
    navVisibility();
    current = routes[h];
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === (PLAY[h] || h)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    current.render(app);
    window.scrollTo(0, 0);
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
  app.innerHTML = '<div class="wrap"><p class="muted">Loading questions…</p></div>';
  DX.load().then(function () {
    route();   /* show the page as soon as the questions are in; the account check carries on behind it */
    DX.cloud.init().catch(function () {}).then(function () {
      navVisibility();
      var h = (location.hash || "#home").slice(1);
      if (h === "home" || h === "" || h === "play" || h === "features" || h === "account" || h === "board" || GATE[h]) route();
    });
  }).catch(function (e) {
    app.innerHTML = '<div class="wrap stack"><h1>Could not load the data</h1><p class="lede">DxDrill needs to be opened from a web address (for example GitHub Pages or Netlify), not by double-clicking the file. Details: ' + esc(e.message) + '</p></div>';
  });
})();
