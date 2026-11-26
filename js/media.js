/* Optional Wikimedia-powered learning media. Never required by the question engine. */
(function () {
  var DX = window.DX, esc = DX.esc;
  var PREFIX = "dx.media.", TTL = 7 * 24 * 60 * 60 * 1000;

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
  function summary(term) {
    var key = "summary." + term.toLowerCase(), hit = cached(key);
    if (hit) return Promise.resolve(hit);
    var slug = encodeURIComponent(term.trim().replace(/\s+/g, "_"));
    return request("https://en.wikipedia.org/api/rest_v1/page/summary/" + slug).then(function (d) {
      var out = { title: d.title || term, extract: d.extract || "", thumbnail: d.thumbnail && d.thumbnail.source || "", page: d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page || "" };
      save(key, out); return out;
    }).catch(function () { return null; });
  }
  function images(term) {
    var key = "images." + term.toLowerCase(), hit = cached(key);
    if (hit) return Promise.resolve(hit);
    var u = new URL("https://commons.wikimedia.org/w/api.php");
    var params = { action: "query", generator: "search", gsrsearch: term, gsrnamespace: "6", gsrlimit: "4", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "640", format: "json", origin: "*" };
    Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); });
    return request(u.toString()).then(function (d) {
      var pages = d.query && d.query.pages || {};
      var out = Object.keys(pages).map(function (id) {
        var p = pages[id], info = p.imageinfo && p.imageinfo[0];
        if (!info || !info.thumburl && !info.url) return null;
        var meta = info.extmetadata || {};
        return {
          title: String(p.title || "").replace(/^File:/, ""),
          image: info.thumburl || info.url,
          page: info.descriptionurl || "",
          license: cleanText(meta.LicenseShortName && meta.LicenseShortName.value) || "Check licence",
          artist: cleanText(meta.Artist && meta.Artist.value) || "Author not listed"
        };
      }).filter(Boolean);
      save(key, out); return out;
    }).catch(function () { return []; });
  }
  function render(target, term) {
    if (!target || !term) return;
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
      target.innerHTML = '<section class="dx-media-panel"><div class="dx-media-head"><b>Visual learning · ' + esc(term) + '</b><button type="button" class="btn ghost small" data-media-close>Close</button></div>' + html +
        '<p class="dx-media-note">Supplementary references only. Check medical facts against your trusted course texts. Image licences and attribution are shown where available.</p></section>';
    });
  }
  DX.media = { render: render };
})();