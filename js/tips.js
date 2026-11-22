/* "How this works": a short pop-up the first time someone opens a feature, and a ? button to open it again any time.
   Edit the words in TIPS below. Each feature shows itself once on its own; nobody sees it twice unless they tap the ? button. */
(function () {
  var DX = window.DX, S = DX.store, esc = DX.esc;
  var TIPS = {
    practice: ["How practice works", [
      "Pick a subject and the topics you want.",
      "Study mode explains each answer as you go. Exam mode saves the marks for the end.",
      "Your progress is saved on this phone. Make a free account to keep it across phones and join the leaderboards."]],
    hall: ["How Hall mode works", [
      "Hall mode is for a group in one room with one shared screen. You do not need an account.",
      "Set up the teams and topics, then pick a round: Rapid fire, Question board, Everyone answers, Describe it or Explain it.",
      "One person is the quizmaster. They read or show the question, then tap Got it, Missed or Skip. Scores update on the board.",
      "Quizmaster tip: keep answers off the shared screen until the right moment. In Question board and Describe it, use Copy answer key and check on your own phone.",
      "Keys on a computer: G got, M missed, S skip, F foul, R show answer, N next clue, Space pause."]],
    cards: ["How flashcards work", [
      "Read the front, try to recall the answer, then flip the card.",
      "Say whether you knew it. Cards you miss come back soon, and cards you know come back later.",
      "Use Stop session any time. It is just for you, so there are no scores to lose."]],
    live: ["How live quizzes work", [
      "Type the 5-letter code from the host and join. Everyone plays on their own phone.",
      "In a team room, tap your team before the host starts.",
      "Answer quickly. Faster right answers score more, and your first answer is the one that counts.",
      "In Describe it rounds, one person on each team describes a term out loud without saying it or the forbidden words. Their teammates guess out loud."]],
    debates: ["How debates work", [
      "Each page has one claim. Take a side, agree or disagree, and say why.",
      "Then read and react to what your classmates wrote. You can suggest topics too."]],
    polls: ["How polls work", [
      "Vote on a poll, and suggest your own for others to vote on.",
      "You need a free account to vote."]],
    competitions: ["How challenges work", [
      "A challenge is a timed, ranked quiz that stays open for a few days.",
      "You get one attempt, so start when you have the time to finish.",
      "Results and rankings appear when it closes."]],
    board: ["How leaderboards work", [
      "Leaderboards rank students by how much they practise.",
      "You need a free account to appear on them."]]
  };
  var open = null, lastFocus = null;
  function seen() { return S.get("dx.tips", {}) || {}; }
  function mark(k) { var s = seen(); s[k] = Date.now(); S.set("dx.tips", s); }
  function close() {
    if (!open) return; var d = open; open = null;
    if (d.parentNode) d.parentNode.removeChild(d);
    document.removeEventListener("keydown", onKey, true);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { } }
  }
  function onKey(e) {
    if (!open) return;
    if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); return; }
    if (e.key === "Tab") {   /* keep focus inside the pop-up */
      var f = open.querySelectorAll("button"); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    } else { e.stopPropagation(); }   /* keys such as G or Space must not reach the page behind */
  }
  function show(key) {
    var t = TIPS[key]; if (!t || open) return;
    lastFocus = document.activeElement;
    var d = document.createElement("div"); d.id = "tipmodal"; d.className = "tipback";
    d.innerHTML = '<div class="tipbox" role="dialog" aria-modal="true" aria-labelledby="tiph"><h2 id="tiph">' + esc(t[0]) + '</h2><ol>' +
      t[1].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ol><div class="row tight"><button type="button" class="btn primary" data-tip="ok">Got it</button></div></div>';
    d.addEventListener("click", function (e) { if (e.target === d || (e.target.getAttribute && e.target.getAttribute("data-tip") === "ok")) close(); });
    document.body.appendChild(d); open = d;
    document.addEventListener("keydown", onKey, true);
    var ok = d.querySelector("[data-tip=ok]"); if (ok) ok.focus();
    mark(key);
  }
  /* the ? button: only on pages that have a tip */
  var help = document.createElement("button");
  help.id = "tiphelp"; help.type = "button"; help.hidden = true; help.setAttribute("aria-label", "How this works"); help.textContent = "?";
  help.onclick = function () { var k = DX.tips.key; if (k) show(k); };
  document.body.appendChild(help);

  DX.tips = {
    key: null,
    /* called after every page change */
    page: function (h) {
      DX.tips.key = TIPS[h] ? h : null;
      help.hidden = !DX.tips.key;
      if (!DX.tips.key || seen()[h]) return;
      (function wait(n) {
        if ((location.hash || "#home").slice(1) !== h) return;               /* they moved on */
        if (document.getElementById("splash") || document.getElementById("updbar") && n < 3) { if (n < 12) setTimeout(function () { wait(n + 1); }, 800); return; }
        setTimeout(function () { if ((location.hash || "#home").slice(1) === h) show(h); }, 500);
      })(0);
    }
  };
})();
