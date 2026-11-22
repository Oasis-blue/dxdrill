/* Send feedback: students write a short message, only the admin reads it. */
(function () {
  var DX = window.DX, esc = DX.esc, app = null;
  var K = { text: DX.store.get("dx.feedback.draft", ""), from: "", sent: false, err: "", busy: false, list: null, confirm: 0 };
  DX.feedback = { render: render, onClick: onClick, onInput: onInput, leave: function () { } };
  window.addEventListener("hashchange", function (e) {
    var old = ((e.oldURL || "").split("#")[1] || "").slice(0, 30);
    if (old && old !== "feedback") K.from = old;
  });
  function C() { return DX.cloud; }
  function admin() { return !!(C() && C().profile && C().profile.is_admin); }
  function repaint() { if ((location.hash || "") === "#feedback" && app) render(app); }
  function fail(e) {
    var m = (e && e.message) || "";
    if (C().isDown(e)) return "DxDrill’s online part is not answering. Try again in a minute. Your message is still here.";
    if (/too many today/i.test(m)) return "You have sent 5 messages today. Please try again tomorrow.";
    if (/too short/i.test(m)) return "Please write a little more (at least 5 characters).";
    if (/too long/i.test(m)) return "That is too long. Keep it under 1000 characters.";
    if (/schema cache|does not exist|send_feedback/i.test(m)) return "Feedback is not switched on yet. Run supabase/update-7.sql in Supabase.";
    return "That did not send. Try again.";
  }
  function load() {
    C().sb.rpc("admin_feedback", { p_limit: 100 }).then(function (r) { if (r.error) throw r.error; K.list = r.data || []; repaint(); })
      .catch(function (e) { K.list = []; K.err = fail(e); repaint(); });
  }
  function render(a) {
    app = a; var c = C();
    if (!c || !c.ok) { a.innerHTML = '<div class="wrap stack"><h1>Send feedback</h1><p class="lede">Feedback could not load. Check your connection and refresh.</p></div>'; return; }
    if (!c.user) { a.innerHTML = '<div class="wrap stack"><header><p class="eyebrow">Feedback</p><h1>Sign in to send feedback</h1><p class="lede">Signing in keeps the box free of spam.</p></header><a class="btn primary" href="#account" style="text-decoration:none">Sign in</a></div>'; return; }
    var out = '<div class="wrap stack"><header><p class="eyebrow">Feedback</p><h1>Send feedback</h1><p class="lede">What is confusing, slow, missing or wrong? Short is fine. Only the person who built DxDrill can read it, and it is saved with your name and class.</p></header>';
    if (K.sent) out += '<p class="note" role="status">Thank you. Your message was sent.</p><div class="row tight"><button class="btn" data-act="again">Send another</button><a class="btn ghost" href="#home" style="text-decoration:none">Back home</a></div>';
    else out += (K.err ? '<p class="note bad" role="alert">' + esc(K.err) + '</p>' : "") +
      '<div class="field"><label class="label" for="fb-text">Your message</label><textarea id="fb-text" rows="6" maxlength="1000" style="width:100%;border:1.5px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);font:inherit">' + esc(K.text) + '</textarea><p class="hint">Up to 1000 characters.</p></div>' +
      '<div class="row tight"><button class="btn primary" data-act="send"' + (K.busy ? " disabled" : "") + '>Send</button></div>';
    if (admin()) {
      if (K.list === null) { K.list = []; load(); }
      out += '<section class="section stack"><h2>Messages (admin)</h2>' + (K.list.length ? K.list.map(function (f) {
        return '<article class="card"><p class="muted" style="font-size:13px">' + esc(f.display_name || "?") + ' · ' + esc(f.class_id || "") + (f.page ? ' · from ' + esc(f.page) : "") + ' · ' + esc(new Date(f.created_at).toLocaleString()) + '</p><p style="overflow-wrap:anywhere;white-space:pre-wrap">' + esc(f.message) + '</p>' +
          (K.confirm === f.id ? '<div class="row tight"><button class="btn small primary" data-act="delyes" data-id="' + f.id + '">Yes, delete</button><button class="btn ghost small" data-act="delno">Keep</button></div>' : '<div class="row tight"><button class="btn ghost small" data-act="del" data-id="' + f.id + '">Delete</button></div>') + '</article>';
      }).join("") : '<p class="muted">No messages yet.</p>') + '</section>';
    }
    a.innerHTML = out + '</div>';
  }
  function onInput(e) { if (e.target && e.target.id === "fb-text") { K.text = e.target.value; DX.store.set("dx.feedback.draft", K.text); } }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null; if (!t) return;
    var a = t.getAttribute("data-act"), id = parseInt(t.getAttribute("data-id"), 10);
    if (a === "send") {
      K.busy = true; K.err = ""; repaint();
      C().sb.rpc("send_feedback", { p_message: K.text, p_page: K.from || "" }).then(function (r) {
        if (r.error) throw r.error; K.busy = false; K.sent = true; K.text = ""; DX.store.set("dx.feedback.draft", ""); K.list = null; repaint();
      }).catch(function (er) { K.busy = false; K.err = fail(er); repaint(); });
    } else if (a === "again") { K.sent = false; repaint(); }
    else if (a === "del") { K.confirm = id; repaint(); }
    else if (a === "delno") { K.confirm = 0; repaint(); }
    else if (a === "delyes") { K.confirm = 0; C().sb.rpc("admin_delete_feedback", { p_id: id }).then(function () { K.list = null; repaint(); }); }
  }
})();

/* A gentle feedback nudge and a back-to-top button. */
(function () {
  var DX = window.DX, S = DX.store, now = Date.now();
  var opens = (S.get("dx.opens", 0) || 0) + 1; S.set("dx.opens", opens);

  /* Feedback toast: from the 5th visit, then at most once a week, only on the home page, never after "Don't ask again". */
  function nudge() {
    if (S.get("dx.nudge.off", false)) return;
    var last = S.get("dx.nudge.last", 0) || 0;
    if (opens < 5 || now - last < 7 * 86400000) return;
    var h = (location.hash || "#home").slice(1);
    if (h !== "home" && h !== "") return;
    if (document.getElementById("updbar") || document.getElementById("splash")) return setTimeout(nudge, 3000);
    S.set("dx.nudge.last", now);
    var d = document.createElement("div"); d.id = "fbnudge"; d.setAttribute("role", "status");
    d.innerHTML = '<p><b>Enjoying DxDrill?</b> Tell us what to fix or add. It takes a minute.</p>' +
      '<div class="fbn-row"><button type="button" class="fbn-go">Send feedback</button><button type="button" class="fbn-no">Not now</button><button type="button" class="fbn-off">Don’t ask again</button></div>';
    function close() { if (d.parentNode) d.parentNode.removeChild(d); }
    d.querySelector(".fbn-go").onclick = function () { close(); location.hash = "#feedback"; };
    d.querySelector(".fbn-no").onclick = close;
    d.querySelector(".fbn-off").onclick = function () { S.set("dx.nudge.off", true); close(); };
    document.body.appendChild(d);
    setTimeout(close, 20000);
  }
  setTimeout(nudge, 6000);

  /* Back to top: appears after a long scroll. */
  var up = document.createElement("button");
  up.id = "totop"; up.type = "button"; up.hidden = true; up.setAttribute("aria-label", "Back to top"); up.textContent = "↑";
  up.onclick = function () {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  document.body.appendChild(up);
  var tick = false;
  window.addEventListener("scroll", function () {
    if (tick) return; tick = true;
    requestAnimationFrame(function () { tick = false; up.hidden = window.scrollY < 900; });
  }, { passive: true });
})();
