/* Shared helpers and data loading for DxDrill. */
window.DX = window.DX || {};
(function () {
  var DX = window.DX;

  DX.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ }
    }
  };

  DX.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* A shuffled order for a question's options (a list of indexes). Options that point at each other
     ("All of the above", "Both A and B") would stop making sense after a shuffle, so those questions keep their order. */
  DX.optOrder = function (opts) {
    var idx = opts.map(function (_, i) { return i; });
    var fixed = opts.some(function (o) { return /\b(all|none|both|neither)\b[^.]{0,20}\b(above|these|of the)\b|\b(option|choice)s? [A-D]\b|\b[A-D] (and|&|or) [A-D]\b/i.test(String(o)); });
    return fixed ? idx : DX.shuffle(idx);
  };
  /* A picture for a question. "image" is a file name inside data/img/histo/ (as before), or a path with a folder such as
     "gross/upper-limb-01.jpg" or "clinical/froment-sign.jpg", which lives in data/img/. An optional "credit" is shown under it. */
  DX.imgSrc = function (name) {
    name = String(name || "");
    if (!/^[A-Za-z0-9][A-Za-z0-9._\/-]*\.(jpg|jpeg|png|webp)$/i.test(name) || name.indexOf("..") > -1 || name.indexOf("//") > -1) return "";
    return "data/img/" + (name.indexOf("/") > -1 ? "" : "histo/") + name;
  };
  DX.qImg = function (q, cls) {
    var src = q && q.image ? DX.imgSrc(q.image) : ""; if (!src) return "";
    var e = DX.esc || function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    return '<figure class="qimg ' + (cls || "") + '"><img src="' + e(src) + '" alt="' + e(q.alt || "Picture for this question") + '" loading="lazy" decoding="async">' +
      (q.credit && cls !== "small" ? '<figcaption>' + e(q.credit) + '</figcaption>' : "") + '</figure>';
  };

  /* If a picture cannot load (weak connection, missing file), show a clear note with a retry button instead of a blank gap. */
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG" || !img.closest || !img.closest(".qimg") || img.getAttribute("data-failed")) return;
    img.setAttribute("data-failed", "1");
    var fig = img.closest(".qimg"), box = document.createElement("div");
    box.className = "qimgfail"; box.setAttribute("role", "status");
    box.innerHTML = '<span>The picture could not load.</span> <button type="button" class="btn small">Try again</button>';
    box.querySelector("button").onclick = function () {
      var src = img.getAttribute("src").split("?")[0];
      box.parentNode.removeChild(box); img.removeAttribute("data-failed"); img.hidden = false;
      img.src = src + "?r=" + Date.now();
    };
    img.hidden = true; fig.insertBefore(box, img);
  }, true);
  DX.shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  DX.pct = function (n, d) { return d ? Math.round(100 * n / d) : 0; };

  /* Per-question history on this device: { id: {n: attempts, c: correct, last: 1|0} } */
  DX.stats = function () { return DX.store.get("dx.stats", {}); };
  DX.record = function (items) {
    var st = DX.stats();
    items.forEach(function (it) {
      var s = st[it.id] || { n: 0, c: 0, last: 0 };
      s.n++; if (it.ok) s.c++; s.last = it.ok ? 1 : 0;
      st[it.id] = s;
    });
    DX.store.set("dx.stats", st);
  };

  /* Each file gets 15 seconds and one retry, so one stalled request cannot freeze the whole app. */
  function getJSON(url, tries) {
    tries = tries || 2;
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error(url + " (" + r.status + ")");
      return r.json();
    }).catch(function (e) {
      clearTimeout(timer);
      if (tries > 1) return getJSON(url, tries - 1);
      throw e;
    });
  }
  /* Run tasks (functions that return promises) a few at a time, so a weak connection is not asked for 80 files at once. */
  function pool(tasks, n) {
    var i = 0;
    return Promise.all(new Array(Math.min(n, tasks.length)).fill(0).map(function () {
      return (function nx() { if (i >= tasks.length) return Promise.resolve(); return tasks[i++]().then(nx); })();
    }));
  }

  DX.load = function () {
    DX.questions = []; DX.tfStems = []; DX.terms = []; DX.topicById = {}; DX.areaById = {}; DX.subjectById = {};
    var manP = getJSON("data/manifest.json");   /* fetched at the same time as the curriculum */
    manP.catch(function () { });
    return getJSON("data/curriculum.json").then(function (cur) {
      DX.curriculum = cur;
      cur.subjects.forEach(function (s) {
        DX.subjectById[s.id] = s;
        s.areas.forEach(function (a) {
          a.subject = s.id; DX.areaById[a.id] = a;
          a.topics.forEach(function (t) {
            t.area = a.id; t.subject = s.id; t.count = 0; DX.topicById[t.id] = t;
          });
        });
      });
      return manP;
    }).then(function (man) {
      var jobs = [];
      DX.questionsReady = false;
      DX.questionsLoading = true;
      DX.questionFilesLoaded = 0;
      DX.questionFilesTotal = (man.questions || []).length;
      /* Start True/False files first so that mode can become usable before the full bank finishes. */
      var questionFiles = (man.questions || []).slice().sort(function (a, b) {
        return (String(b).indexOf("tf-") === 0 ? 1 : 0) - (String(a).indexOf("tf-") === 0 ? 1 : 0);
      });
      questionFiles.forEach(function (f) {
        jobs.push(function () { return getJSON("data/questions/" + f + ".json").then(function (d) {
          /* One topic for the whole file ("topic"), or a "topic" on each question to mix topics in one file. A question's own topic wins. */
          var beforeTf = DX.tfStems.length;
          var fileT = DX.topicById[d.topic], bad = 0;
          if (!fileT && !d.questions.some(function (q) { return DX.topicById[q.topic]; })) { console.warn("Unknown topic id in " + f + ": " + d.topic); return; }
          d.questions.forEach(function (q) {
            var t = DX.topicById[q.topic] || fileT;
            if (!t) { bad++; return; }
            q.topic = t.id; q.area = t.area; q.subject = t.subject;
            if (q.type === "tf") {
              /* Keep true/false stems separate from every existing question mode. */
              var okTf = q.id && q.q && Array.isArray(q.items) && q.items.length >= 4 && q.items.length <= 5 &&
                q.items.every(function (x) { return x && x.text && typeof x.answer === "boolean" && x.explain; });
              if (!okTf) { console.warn("Skipped a malformed true/false stem: " + q.id); return; }
              if (DX.tfStems.some(function (x) { return x.id === q.id; })) { console.warn("Duplicate true/false id: " + q.id); return; }
              DX.tfStems.push(q); t.tfCount = (t.tfCount || 0) + 1;
              return;
            }
            DX.questions.push(q); t.count++;
          });
          if (DX.tfStems.length > beforeTf && DX.onTfProgress) DX.onTfProgress();
          if (bad) console.warn(bad + " question(s) in " + f + " have no known topic and were skipped");
          DX.questionFilesLoaded++;
          if (!DX.questionsReady && DX.questions.length) {
            DX.questionsReady = true;
            if (DX.onQuestionsReady) DX.onQuestionsReady();
          } else if (DX.questionsReady && DX.onQuestionsProgress) DX.onQuestionsProgress();
        }).catch(function (e) { console.warn("Could not load question file", e.message); }); });
      });
      (man.terms || []).forEach(function (f) {
        jobs.push(function () { return getJSON("data/" + f + ".json").then(function (d) {
          d.terms.forEach(function (x) {
            var t = DX.topicById[x.topic];
            if (!t) return;
            x.area = t.area; x.subject = t.subject;
            DX.terms.push(x);
          });
        }).catch(function (e) { console.warn("Could not load terms file", e.message); }); });
      });
      /* Let the app shell open as soon as the curriculum and manifest are ready.
         The question and term files continue loading in the background. Pages that
         need the bank wait for DX.loadingQuestions to become false. */
      DX.loadingQuestions = true;
      DX.questionsReady = false;
      DX.partial = true;
      pool(jobs, 6).then(function () {
        DX.loadingQuestions = false;
        DX.questionsLoading = false;
        DX.questionsReady = true;
        DX.partial = false;
        if (DX.onTfProgress) DX.onTfProgress();
        if (DX.onMore) DX.onMore();
      });
      return;
    });
  };

  DX.areaCount = function (areaId) {
    return DX.areaById[areaId].topics.reduce(function (n, t) { return n + t.count; }, 0);
  };
  DX.subjectCount = function (subId) {
    return DX.subjectById[subId].areas.reduce(function (n, a) { return n + DX.areaCount(a.id); }, 0);
  };
})();
