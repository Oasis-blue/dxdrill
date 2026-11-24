/* Small effects: short sounds (made in the browser, no files), a tick, a shake, count-up numbers, a flip. Everything respects "reduce motion". */
(function () {
  var DX = window.DX, ac = null, master = null;
  var css = document.createElement("style");
  css.textContent =
    "@keyframes fxshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}" +
    "@keyframes fxpop{0%{transform:scale(1)}45%{transform:scale(1.045)}100%{transform:scale(1)}}" +
    "@keyframes fxflip{0%{transform:perspective(800px) rotateX(-70deg);opacity:0}100%{transform:perspective(800px) rotateX(0);opacity:1}}" +
    "@keyframes fxrise{0%{transform:translateY(10px);opacity:0}100%{transform:translateY(0);opacity:1}}" +
    "@keyframes fxbeat{0%{transform:scale(.6);opacity:0}30%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}" +
    "html:not(.fx-off) .fx-shake{animation:fxshake .42s ease-in-out}" +
    "html:not(.fx-off) .fx-pop{animation:fxpop .4s ease-out}" +
    "html:not(.fx-off) .fx-flipin{animation:fxflip .45s ease-out;transform-origin:top center}" +
    "html:not(.fx-off) .fx-rise{animation:fxrise .3s ease-out}" +
    "html:not(.fx-off) .fx-beat{animation:fxbeat .5s ease-out}" +
    ".fxmk{float:right;margin-left:10px;font-weight:700;font-size:13px}.fxmk.ok{color:var(--good,#1b7f4a)}.fxmk.no{color:var(--bad,#b3261e)}" +
    ".opt.correct::after{content:\"\\2713\";margin-left:auto;padding-left:10px;font-weight:700;color:var(--good)}" +
    ".opt.wrong::after{content:\"\\2717\";margin-left:auto;padding-left:10px;font-weight:700;color:var(--bad)}" +
    "@media (prefers-reduced-motion:reduce){.fx-shake,.fx-pop,.fx-flipin,.fx-rise,.fx-beat{animation:none!important}}";
  document.head.appendChild(css);

  function on() { return DX.store.get("dx.fx", true) !== false; }
  function apply() { document.documentElement.classList.toggle("fx-off", !on()); }
  apply();

  function audio() {
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.7;
        var comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function tone(f, t0, dur, type, peak) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  var S = {
    ok: function (t) { tone(784, t, 0.18, "triangle", 0.3); tone(1047, t + 0.1, 0.3, "triangle", 0.3); },
    bad: function (t) { tone(220, t, 0.25, "sawtooth", 0.11); tone(165, t + 0.13, 0.35, "sawtooth", 0.11); },
    tick: function (t) { tone(990, t, 0.06, "square", 0.12); },
    ready: function (t) { tone(660, t, 0.12, "sine", 0.28); },
    go: function (t) { tone(988, t, 0.25, "sine", 0.32); },
    bell: function (t) {
      [0, 0.55].forEach(function (d, k) {
        [[1, 1, 2.0], [2.4, 0.55, 1.3], [3.8, 0.35, 0.9]].forEach(function (p) { tone(660 * p[0], t + d, p[2], "sine", 0.3 * (k ? 0.8 : 1) * p[1]); });
      });
    },
    done: function (t) { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.11, 0.4, "triangle", 0.28); }); }
  };
  /* mode: "all" plays whenever the top-bar Sound is on; "live" also needs the Live sound switch (phones default to silent in a crowded room) */
  function play(name, mode) {
    if (!DX.sound) return;
    if (mode === "live" && !DX.store.get("dx.livesound", false)) return;
    var c = audio(); if (!c || !S[name]) return; S[name](c.currentTime + 0.01);
  }
  function buzz(ms) { try { if (on() && navigator.vibrate) navigator.vibrate(ms); } catch (e) { } }
  function add(el, cls) { if (!el || !on()) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function countUp(el, from, to, ms) {
    if (!el) return; from = Number(from) || 0; to = Number(to) || 0;
    var calm = !on() || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (calm || from === to) { el.textContent = to; return; }
    var t0 = performance.now(); ms = ms || 700;
    (function step(now) {
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1 && document.body.contains(el)) requestAnimationFrame(step); else el.textContent = to;
    })(t0);
  }
  DX.fx = { on: on, apply: apply, play: play, buzz: buzz, add: add, countUp: countUp, unlock: audio,
    toggle: function () { DX.store.set("dx.fx", !on()); apply(); },
    liveSound: function () { return DX.store.get("dx.livesound", false); },
    toggleLiveSound: function () { DX.store.set("dx.livesound", !DX.store.get("dx.livesound", false)); }
  };
})();
