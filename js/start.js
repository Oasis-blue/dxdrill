/* How to start: a short guide for new students. Edit the text below. */
(function () {
  var DX = window.DX, esc = DX.esc;
  var STEPS = [
    ["Open DxDrill", "Open the link in your phone’s browser. You can use it without an account. To keep it handy, use the Install button at the top, or “Add to Home screen” in your browser menu."],
    ["Make an account (optional, but needed for leaderboards, challenges and live quizzes)", "Go to Account and choose Create account. Use your real email so you can reset your password later. Pick a display name your classmates will recognise, and choose your class. Your name and class show on the leaderboards, and your email does not."],
    ["Practice", "Pick a subject and topic. Study mode explains every answer as you go. Exam mode saves the marks for the end."],
    ["Play", "Flashcards help you recall things without looking. Challenges are ranked quizzes that stay open for a few days. For a live quiz, type the code the host shows and answer on your phone. Faster right answers score more."],
    ["See how your class is doing", "Open Leaderboards to see top students and class rankings."],
    ["Tell us what is wrong or missing", "Use Report a problem on a question that looks wrong, and Send feedback for anything else. Both go straight to the person who built this."]
  ];
  var TIPS = [
    "If you are logged out straight after signing in, check your phone’s date and time. Set them to automatic and reload.",
    "Emails from DxDrill (like password resets) may land in your spam or junk folder. Check there.",
    "During a live quiz, keep the page open and your screen on. If your connection drops, reload and join with the same code.",
    "Your practice history and flashcard progress are kept on the device you use, so they do not follow you to another phone yet."
  ];
  DX.start = {
    render: function (a) {
      a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Guide</p><h1>How to start</h1><p class="lede">DxDrill is free. Here is everything you need to get going.</p></header>' +
        '<ol class="stack" style="padding-left:1.2em">' + STEPS.map(function (s) { return '<li><b>' + esc(s[0]) + '</b><br><span class="muted">' + esc(s[1]) + '</span></li>'; }).join("") + '</ol>' +
        '<section class="section stack"><h2>Good to know</h2><ul>' + TIPS.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul></section>' +
        '<div class="row tight"><a class="btn primary" href="#account" style="text-decoration:none">Make an account</a><a class="btn" href="#practice" style="text-decoration:none">Start practising</a></div></div>';
    }
  };
})();
