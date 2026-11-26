/* Optional Wikimedia-powered learning media. Never required by the question engine. */
(function () {
  var DX = window.DX, esc = DX.esc;
  /* v3 bypasses older, poorly ranked search results. */
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
  function contextText(context) {
    return [context.subject, context.area, context.topic, context.curriculumTopic,
      context.question, context.correctAnswer, context.explanation].filter(Boolean).join(" ");
  }
  function profileFor(context) {
    var subject = String(context.subject || "").toLowerCase();
    var text = contextText(context).toLowerCase();
    if (/diuretic|furosemide|frusemide|thiazide|spironolactone|amiloride|mannitol|acetazolamide/.test(text)) return { kind: "Renal physiology / pharmacology", hint: "nephron diuretic site of action diagram", boost: ["diuretic", "nephron", "loop", "thiazide", "collecting duct", "site of action"] };
    if (/l.?dopa|levodopa|dopamine|dopa decarboxylase|carbidopa/.test(text)) return { kind: "Neurochemistry / pharmacology", hint: "L-DOPA dopamine synthesis metabolism pathway diagram", boost: ["dopamine", "levodopa", "l-dopa", "carbidopa", "decarboxylase", "blood brain barrier"] };
    /* Curriculum subject is authoritative; don't infer Anatomy from a generic section label. */
    if (/anatomy/.test(subject)) return { kind: "Anatomy", hint: "anatomical structure labelled diagram" , boost: ["anatomy", "anatomical", "structure", "nerve", "artery", "muscle"] };
    if (/physiology/.test(subject)) return { kind: "Physiology", hint: "physiology mechanism diagram graph", boost: ["physiology", "mechanism", "pathway", "nephron", "cardiac", "renal", "transport"] };
    if (/biochemistry/.test(subject)) return { kind: "Biochemistry", hint: "biochemical pathway molecular mechanism diagram", boost: ["biochemistry", "pathway", "metabolism", "molecular", "enzyme", "substrate"] };
    if (/pharmacology|therapeutics/.test(subject)) return { kind: "Pharmacology", hint: "drug mechanism pharmacology pathway diagram", boost: ["pharmacology", "drug", "mechanism", "receptor", "pathway", "pharmacokinetics"] };
    if (/pathology/.test(subject)) return { kind: "Pathology", hint: "pathology histopathology medical diagram", boost: ["pathology", "histology", "histopathology", "lesion", "microscopic"] };
    if (/radiology/.test(subject)) return { kind: "Radiology", hint: "radiology medical imaging", boost: ["radiology", "radiograph", "x-ray", "ultrasound", "ct", "mri"] };
    if (/medicine|clinical|surgery|paediatrics|pediatrics|obstetrics|gynaecology|psychiatry/.test(subject)) return { kind: "Clinical medicine", hint: "clinical medical mechanism diagram", boost: ["clinical", "medical", "diagnosis", "treatment", "mechanism"] };
    if (/histolog|microscop|epitheli|connective tissue|cartilage|bone tissue|blood smear|tissue section/.test(text)) return { kind: "Histology", hint: "histology micrograph microscope slide", boost: ["histology", "micrograph", "microscopic", "stained", "slide", "tissue"] };
    if (/x.?ray|radiograph|fracture|dislocation|pneumothorax|pleural effusion|radiology/.test(text)) return { kind: "Radiology", hint: "medical radiograph X-ray", boost: ["radiograph", "x-ray", "radiology", "fracture", "imaging"] };
    if (/glycolysis|gluconeogen|glycogen|krebs|citric acid|urea cycle|beta oxidation|fatty acid|metabolic pathway|enzyme kinetics/.test(text)) return { kind: "Biochemistry", hint: "biochemical pathway diagram molecular mechanism", boost: ["biochemistry", "pathway", "metabolism", "enzyme", "molecular"] };
    if (/physiolog|renal|kidney|nephron|glomerul|tubular|cardiovascular|respiratory|gfr|glomerular filtration|blood pressure|ventilation perfusion/.test(text)) return { kind: "Physiology", hint: "physiology mechanism diagram graph", boost: ["physiology", "diagram", "mechanism", "graph", "cycle"] };
    return { kind: "Medical topic (not confidently classified)", hint: "medical educational diagram", boost: ["medical", "clinical", "mechanism", "diagram"] };
  }
  function searchQuery(context, profile) {
    var source = [context.topic, context.curriculumTopic, context.question, context.correctAnswer, context.explanation].join(" ");
    var stop = /^(the|and|for|with|from|that|this|into|than|when|where|which|what|does|show|shown|following|correct|answer|question|because|there|their|they|them|into|over|under|after|before|during|between|through|using|used|most|likely|patient|patients|clinical|correlation|correlations|lecture|types|type|describe|state|explain|select|choose|true|false|except|only|also|some|such|more|less|each|both|been|being|were|was|are|is|has|have|had|can|may|will|would|should|could|not|all|any|one|two|three|four|five|its|his|her|their|which|who|whom|a|an|of|to|in|on|at|by|as|or|if)$/i;
    var words = source.toLowerCase().replace(/[^a-z0-9+.-]+/g, " ").split(/\s+/).filter(function (w) {
      return w.length > 2 && !stop.test(w) && !/^\d+$/.test(w);
    });
    var unique = [];
    words.forEach(function (w) { if (unique.indexOf(w) < 0 && unique.length < 9) unique.push(w); });
    return unique.join(" ") + " " + profile.hint;
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
    var words = topic.split(/\s+/).filter(function (w) { return w.length > 2 && !/^(the|and|for|with|from|part|system|types|type)$/.test(w); });
    /* Publication scans and covers are not useful visual-learning references. */
    if (/\b(book|cover|textbook|atlas|syllabus|lecture|catalog|catalogue|journal|magazine|publisher|publication|title page|front matter|table of contents|pdf scan)\b/.test(text)) return -100;
    if (/\b(logo|icon|flag|coat of arms)\b/.test(title)) return -100;
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
      }).filter(Boolean).filter(function (item) { return item._score >= 8; });
      out.sort(function (a, b) { return b._score - a._score || a._order - b._order; });
      return out.slice(0, 4).map(function (item) {
        delete item._score; delete item._order; return item;
      });
    }).catch(function () { return []; });
  }
  function images(context, profile) {
    var query = searchQuery(context, profile);
    var key = "images." + query.toLowerCase(), hit = cached(key);
    if (hit) return Promise.resolve(hit);
    return commonsSearch(query, query, profile).then(function (out) {
      save(key, out); return out;
    }).catch(function () { return []; });
  }
  function render(target, context) {
    if (!target || !context) return;
    var profile = profileFor(context);
    var label = context.topic || context.curriculumTopic || "this question";
    target.innerHTML = '<div class="dx-media-state"><span class="spin"></span> Finding optional learning media…</div>';
    Promise.all([images(context, profile)]).then(function (results) {
      if (!target.isConnected) return;
      var imgs = results[0], html = "";
      if (imgs.length) {
        html += '<div class="dx-media-grid">' + imgs.map(function (im) {
          return '<figure><a href="' + esc(im.page || im.image) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(im.image) + '" alt="' + esc(im.title) + '" loading="lazy" decoding="async"></a>' +
            '<figcaption><b>' + esc(im.title) + '</b><br>' + esc(im.license) + ' · ' + esc(im.artist) + (im.page ? '<br><a href="' + esc(im.page) + '" target="_blank" rel="noopener noreferrer">Source and licence</a>' : '') + '</figcaption></figure>';
        }).join("") + '</div>';
      }
      if (!html) html = '<p class="muted">No sufficiently relevant external images were found for this question. The question and explanation remain available above.</p>';
      target.innerHTML = '<section class="dx-media-panel"><div class="dx-media-head"><b>Visual learning · ' + esc(label) + '</b><button type="button" class="btn ghost small" data-media-close>Close</button></div>' +
        '<p class="dx-media-note">Search focus: ' + esc(profile.kind) + '. Based on the question, correct answer and explanation. Images are supplementary; verify medical facts against trusted course texts. Source and licence details are shown where available.</p>' + html + '</section>';
      var close = target.querySelector("[data-media-close]");
      if (close) close.addEventListener("click", function () { target.innerHTML = ""; });
    });
  }
  DX.media = { render: render };
})();
