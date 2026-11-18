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

  var routes = {
    home: { render: home },
    practice: DX.practice,
    hall: DX.hall,
    board: DX.board,
    account: DX.account
  };

  function route() {
    var h = (location.hash || "#home").slice(1);
    if (!routes[h]) h = "home";
    if (current && current.leave) current.leave();
    current = routes[h];
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === h) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
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

  window.addEventListener("hashchange", route);
  app.innerHTML = '<div class="wrap"><p class="muted">Loading questions…</p></div>';
  DX.load().then(function () { return DX.cloud.init().catch(function () {}); }).then(route).catch(function (e) {
    app.innerHTML = '<div class="wrap stack"><h1>Could not load the data</h1><p class="lede">DxDrill needs to be opened from a web address (for example GitHub Pages or Netlify), not by double-clicking the file. Details: ' + esc(e.message) + '</p></div>';
  });
})();
