/* Optional Wikimedia-powered learning media. Never required by the question engine. */
(function () {
  var DX = window.DX, esc = DX.esc;
  /* v2 deliberately bypasses older generic-search cache entries. */
  var PREFIX = "dx.media.v3.", TTL = 7 * 24 * 60 * 60 * 1000;

  function cached(key) {
    var item = DX.store.get(PREFIX + key, null);
    return item && item.t && Date.now() - item.t < TTL ? item.data : null;
  }
  function save(key, data) {
    DX.store.set(PREFIX + key, { t: Date.now(), data: data });
  }
  function request(url) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) {
      if (!r.ok) throw new Error("Media request failed (" + r.status + ")");
      return r.json();
    }).finally(function () { clearTimeout(timer); });
  }
  function cleanText(value) {
    return String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }
  function profileFor(term) {
    var t = String(term || "").toLowerCase();
    if (/diuretic|diuretics|furosemide|frusemide|thiazide|spironolactone|amiloride|mannitol|acetazolamide/.test(t)) {
      return { kind: "Renal physiology", hint: "nephron site of action mechanism diagram", boost: ["diuretic", "nephron", "loop", "thiazide", "collecting duct", "mechanism", "site of action"] };
    }
    if (/histolog|microscop|epitheli|connective tissue|cartilage|bone tissue|blood smear|tissue section/.test(t)) {
      return { kind: "Histology", hint: "histology micrograph microscope slide", boost: ["histology", "micrograph", "microscopic", "stained", "slide", "tissue"] };
    }
    if (/x.?ray|radiograph|fracture|dislocation|pneumothorax|pleural effusion|chest imaging|radiology/.test(t)) {
      return { kind: "Radiology", hint: "medical radiograph X-ray", boost: ["radiograph", "x-ray", "radiology", "fracture", "imaging"] };
    }
    if (/froment|dinner.?fork|wrist drop|foot drop|claw hand|waiter.?s tip|clinical sign|clinical examination|deformity|palsy/.test(t)) {
      return { kind: "Clinical signs", hint: "clinical sign medical photograph illustration", boost: ["clinical", "sign", "photograph", "illustration", "deformity", "palsy"] };
    }
    if (/physiolog|renal|kidney|nephron|glomerul|tubular|cardiovascular|respiratory physiology|renal physiology|gastrointestinal physiology|endocrine physiology|reproductive physiology|blood and body fluids|fluid balance|thermoregulation|neuromuscular|nerve conduction|ecg|electrocardio|spirom|lung volume|oxygen dissociation|oxy.?haemoglobin|oxy.?hemoglobin|cardiac cycle|wiggers|action potential|membrane potential|gfr|glomerular filtration|renal clearance|blood pressure|ventilation perfusion/.test(t)) {
      return { kind: "Physiology", hint: "physiology diagram graph medical illustration", boost: ["physiology", "diagram", "graph", "waveform", "curve", "cycle"] };
    }
    if (/biochem|glycolysis|gluconeogen|glycogen|krebs|citric acid|urea cycle|beta oxidation|fatty acid|lipid metabolism|carbohydrate metabolism|amino acid|nucleic acid|protein metabolism|protein synthesis|purine|pyrimidine|vitamin|heme|haem|buffer|acid.?base|metabolic pathway|dna replication|rna transcription|enzyme kinetics/.test(t)) {
      return { kind: "Biochemistry", hint: "biochemistry pathway diagram molecular illustration", boost: ["biochemistry", "pathway", "metabolism", "molecular", "diagram", "enzyme"] };
    }
    return { kind: "Anatomy", hint: "anatomy labelled medical diagram specimen", boost: ["anatomy", "diagram", "labelled", "labeled", "specimen", "dissection"] };
  }
  function summary(term) {
    var key = "summary." + term.toLowerCase(), hit = cached(key);
    if (hit) return Promise.resolve(hit);
    var slug = encodeURIComponent(term.trim().replace(/\s+/g, "_"));
    return request("https://en.wikipedia.org/api/rest_v1/page/summary/" + slug).then(function (d) {
      var out = { title: d.title || term, extract: d.extract || "", thumbnail: d.thumbnail && d.thumbnail.source || "", page: d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page || "" };
      save(key, out); return out;
    }).catch(function () { return null; });
  }
  function imageScore(item, term, profile) {
    var title = String(item.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
    var description = String(item.description || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
    var text = title + " " + description;
    var topic = String(term || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    var words = topic.split(/\\s+/).filter(function (w) { return w.length > 2 && !/^(the|and|for|with|from|part|system|types|type)$/.test(w); });
    /* Publication scans and covers are not useful visual-learning references. */
    if (/\\b(book|cover|textbook|atlas|syllabus|lecture|catalog|catalogue|journal|magazine|publisher|publication|title page|front matter|table of contents|pdf scan)\\b/.test(text)) return -100;
    if (/\\b(logo|icon|flag|coat of arms)\\b/.test(title)) return -100;
    var score = topic && text.indexOf(topic) > -1 ? 12 : 0;
    var matched = 0;
    words.forEach(function (w) { if (text.indexOf(w) > -1) { score += 4; matched++; } });
    profile.boost.forEach(function (w) { if (text.indexOf(w) > -1) score += 3; });
    if (score < 8 || (!matched && !profile.boost.some(function (w) { return text.indexOf(w) > -1; }))) return -100;
    return score;
  }
  function commonsSearch(query, term, profile) {
    var u = new URL("https://commons.wikimedia.org/w/api.php");
    var params = {
      action: "query", generator: "search", gsrsearch: query,
      gsrnamespace: "6", gsrlimit: "16", prop: "imageinfo",
      iiprop: "url|extmetadata", iiurlwidth: "640", format: "json", origin: "*"
    };
    Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); });
    return request(u.toString()).then(function (d) {
      var pages = d.query && d.query.pages || {};
      var out = Object.keys(pages).map(function (id, index) {
        var p = pages[id], info = p.imageinfo && p.imageinfo[0];
        if (!info || !info.thumburl && !info.url) return null;
        var meta = info.extmetadata || {};
        var item = {
          title: String(p.title || "").replace(/^File:/, ""),
          image: info.thumburl || info.url,
          page: info.descriptionurl || "",
          license: cleanText(meta.LicenseShortName && meta.LicenseShortName.value) || "Check licence",
          artist: cleanText(meta.Artist && meta.Artist.value) || "Author not listed",
          description: cleanText(meta.ImageDescription && meta.ImageDescription.value) || cleanText(meta.ObjectName && meta.ObjectName.value) || ""
        };
        item._score = imageScore(item, term, profile);
        item._order = index;
        return item;
      }).filter(Boolean).filter(function (item) { return !/\b(logo|icon|flag|coat of arms)\b/i.test(item.title); });
      out.sort(function (a, b) { return b._score - a._score || a._order - b._order; });
      return out.slice(0, 4).map(function (item) {
        delete item._score; delete item._order; return item;
      });
    }).catch(function () { return []; });
  }
  function images(term) {
    var key = "images." + term.toLowerCase(), hit = cached(key);
    if (hit) return Promise.resolve(hit);
    var profile = profileFor(term);
    /* Focused visual query only: do not broaden into unqualified publication searches. */
    return commonsSearch(term + " " + profile.hint, term, profile).then(function (out) {
      save(key, out); return out;
    }).catch(function () { return []; });
  }
  function render(target, term) {
    if (!target || !term) return;
    var profile = profileFor(term);
    target.innerHTML = '<div class="dx-media-state"><span class="spin"></span> Finding optional learning media…</div>';
    Promise.all([summary(term), images(term)]).then(function (results) {
      if (!target.isConnected) return;
      var s = results[0], imgs = results[1], html = "";
      if (s && s.extract) {
        html += '<article class="dx-media-summary">' + (s.thumbnail ? '<img src="' + esc(s.thumbnail) + '" alt="" loading="lazy" decoding="async">' : '') +
          '<div><b>' + esc(s.title) + '</b><p>' + esc(s.extract) + '</p>' +
          (s.page ? '<a href="' + esc(s.page) + '" target="_blank" rel="noopener noreferrer">Wikipedia source</a>' : '') + '</div></article>';
      }
      if (imgs.length) {
        html += '<div class="dx-media-grid">' + imgs.map(function (im) {
          return '<figure><a href="' + esc(im.page || im.image) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(im.image) + '" alt="' + esc(im.title) + '" loading="lazy" decoding="async"></a>' +
            '<figcaption><b>' + esc(im.title) + '</b><br>' + esc(im.license) + ' · ' + esc(im.artist) + (im.page ? '<br><a href="' + esc(im.page) + '" target="_blank" rel="noopener noreferrer">Source and licence</a>' : '') + '</figcaption></figure>';
        }).join("") + '</div>';
      }
      if (!html) html = '<p class="muted">No external media was found. Your question and explanation are still available above.</p>';
      target.innerHTML = '<section class="dx-media-panel"><div class="dx-media-head"><b>Visual learning · ' + esc(term) + '</b><button type="button" class="btn ghost small" data-media-close>Close</button></div>' +
        '<p class="dx-media-note">Search focus: ' + esc(profile.kind) + '. Images are supplementary; verify medical facts against trusted course texts. Source and licence details are shown where available.</p>' + html + '</section>';
      var close = target.querySelector("[data-media-close]");
      if (close) close.addEventListener("click", function () { target.innerHTML = ""; });
    });
  }
  DX.media = { render: render };
})();
