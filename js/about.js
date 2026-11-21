/* About page: what DxDrill is, who built it, and what is stored. Edit the text in ABOUT below. */
(function () {
  var DX = window.DX, esc = DX.esc;
  var ABOUT = {
    what: "DxDrill is a free study platform for medical students. It has practice questions with explanations, live quiz rounds for the hall, class leaderboards and fun polls. Topics follow the MDCN curriculum guidelines.",
    free: "It is free and has no ads. Practice and Hall mode work without an account. An account adds your name to the class leaderboards.",
    builder: "Built by Alex “Mantra” Okoh, a medical student at FUHSO.",
    content: "Questions are drafted with AI help from textbooks and lecture notes. Unless a question is marked verified, check it against your own notes. If something looks wrong, use Report a problem on the question.",
    privacy: [
      "When you make an account, DxDrill stores your email, the name you choose, and your class.",
      "It also stores which questions you answered, whether you got them right, and when. This is what builds the leaderboards.",
      "Your name and class appear on the leaderboards. Your email does not.",
      "If you send feedback, the message is saved with your name and class, and only the admin can read it.",
      "Poll votes are counted per option. The site does not show anyone who voted for what.",
      "Your practice history and settings stay on your own device.",
      "Nothing is sold or shared for advertising. The site runs on GitHub Pages, and accounts and scores are kept in a Supabase database.",
      "The admin can see the account list and scores, and has access to the database. To have your account and scores removed, ask the admin."
    ]
  };
  DX.about = {
    render: function (a) {
      a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">About</p><h1>About DxDrill</h1><p class="lede">' + esc(ABOUT.what) + '</p></header>' +
        '<section class="section stack"><h2>Free for everyone</h2><p>' + esc(ABOUT.free) + '</p></section>' +
        '<section class="section stack"><h2>Who built it</h2><p>' + esc(ABOUT.builder) + '</p></section>' +
        '<section class="section stack"><h2>About the questions</h2><p>' + esc(ABOUT.content) + '</p></section>' +
        '<section class="section stack"><h2>What DxDrill stores</h2><ul>' + ABOUT.privacy.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul></section></div>';
    }
  };
})();
