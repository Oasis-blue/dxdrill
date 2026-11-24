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

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + " (" + r.status + ")");
      return r.json();
    });
  }

  DX.load = function () {
    DX.questions = []; DX.terms = []; DX.topicById = {}; DX.areaById = {}; DX.subjectById = {};
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
      (man.questions || []).forEach(function (f) {
        jobs.push(getJSON("data/questions/" + f + ".json").then(function (d) {
          /* One topic for the whole file ("topic"), or a "topic" on each question to mix topics in one file. A question's own topic wins. */
          var fileT = DX.topicById[d.topic], bad = 0;
          if (!fileT && !d.questions.some(function (q) { return DX.topicById[q.topic]; })) { console.warn("Unknown topic id in " + f + ": " + d.topic); return; }
          d.questions.forEach(function (q) {
            var t = DX.topicById[q.topic] || fileT;
            if (!t) { bad++; return; }
            q.topic = t.id; q.area = t.area; q.subject = t.subject;
            DX.questions.push(q); t.count++;
          });
          if (bad) console.warn(bad + " question(s) in " + f + " have no known topic and were skipped");
        }).catch(function (e) { console.warn("Could not load question file", e.message); }));
      });
      (man.terms || []).forEach(function (f) {
        jobs.push(getJSON("data/" + f + ".json").then(function (d) {
          d.terms.forEach(function (x) {
            var t = DX.topicById[x.topic];
            if (!t) return;
            x.area = t.area; x.subject = t.subject;
            DX.terms.push(x);
          });
        }).catch(function (e) { console.warn("Could not load terms file", e.message); }));
      });
      return Promise.all(jobs);
    });
  };

  DX.areaCount = function (areaId) {
    return DX.areaById[areaId].topics.reduce(function (n, t) { return n + t.count; }, 0);
  };
  DX.subjectCount = function (subId) {
    return DX.subjectById[subId].areas.reduce(function (n, a) { return n + DX.areaCount(a.id); }, 0);
  };
})();
