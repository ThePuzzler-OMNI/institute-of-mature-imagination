(function () {
  /**
   * Product shelf = Puzzler static shortlist (archive-data.js).
   * Everyone rides the steward's curated "best for me" vibes — not a
   * per-visitor LLM re-rank. Full library API stays available later for depth.
   */
  var STATIC_ARCHIVE = (window.IMI_ARCHIVE || []).slice();
  let data = STATIC_ARCHIVE.slice();
  const results = document.getElementById("results");
  const empty = document.getElementById("empty");
  const input = document.getElementById("q");
  const inviteStrip = document.getElementById("invite-strip");
  const year = document.getElementById("y");
  if (year) year.textContent = String(new Date().getFullYear());

  var API_BASE = (
    (window.OMNI_SITE && window.OMNI_SITE.apiBase) ||
    "https://onemission-omni-chat.azurewebsites.net"
  ).replace(/\/$/, "");
  var MEMBER_SESSION_KEY = "omni_member_session_v1";
  var MEMBER_META_KEY = "omni_member_meta_v1";
  var SHELF_CACHE_PREFIX = "imi_shelf_v1_";
  var liveShelf = null; // optional mirror of static slices for chrome; not personalized

  function sourceKind(item) {
    const s = item.source || "";
    if (/\/i\/spaces\//i.test(s) || /spaces\.x\.com/i.test(s)) return "space";
    if (/\/status\//i.test(s)) return "post";
    return "other";
  }

  /** Bare profile URLs do not drive traffic to a moment — refuse to paint a fake CTA. */
  function isDeepSource(item) {
    const s = (item && item.source) || "";
    return /\/status\/\d+/i.test(s) || /\/i\/spaces\//i.test(s) || /spaces\.x\.com/i.test(s);
  }


  /** Hero card — prefer featured Space URL; else first featured post with deep link */
  function paintLiveHero() {
    const el = document.getElementById("live-space");
    if (!el) return;
    const feat =
      data.find((x) => x && x.featured && isDeepSource(x) && sourceKind(x) === "space") ||
      data.find((x) => x && x.featured && isDeepSource(x)) ||
      data.find((x) => x && isDeepSource(x) && sourceKind(x) === "space");
    // X-like chrome on the hero strip
    el.classList.add("x-card", "x-card--space");
    el.style.textDecoration = "none";
    if (!feat) {
      el.href = "https://x.com/omni_puzzler";
      const titleEl = el.querySelector("[data-live-title]");
      const blurbEl = el.querySelector("[data-live-blurb]");
      if (titleEl) titleEl.textContent = "Best of @omni_puzzler on X";
      if (blurbEl)
        blurbEl.textContent =
          "Featured moments below open real posts and Spaces — laid out like X so you know what you’re joining.";
      return;
    }
    el.href = feat.source;
    const titleEl = el.querySelector("[data-live-title]");
    const blurbEl = el.querySelector("[data-live-blurb]");
    const sk = sourceKind(feat);
    if (titleEl) {
      titleEl.textContent =
        (sk === "space" ? "Space · " : "Post · ") + (feat.title || "Featured on X");
    }
    if (blurbEl) blurbEl.textContent = feat.blurb || "Open on X — same room, same thread.";
  }

  /** Full-width invite for pin:true — set apart from archive tiles so people DM for Space time */
  function paintInvite(list) {
    if (!inviteStrip) return;
    const pins = (list || data).filter((x) => x && x.pin);
    if (!pins.length) {
      inviteStrip.innerHTML = "";
      return;
    }
    inviteStrip.innerHTML = pins
      .map((item) => {
        const tags = (item.tags || [])
          .slice(0, 5)
          .map(
            (t) =>
              `<span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/55">${t}</span>`
          )
          .join(" ");
        return `
      <article class="invite-card card-hover rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-void bg-gradient-to-r from-accent to-glow px-2.5 py-1 rounded-full">Request Space time</span>
          <span class="text-[11px] text-glow/80">${item.kind || "Invite"}</span>
          <time class="text-[11px] text-white/35 ml-auto">${item.date || ""}</time>
        </div>
        <h2 class="text-2xl md:text-3xl font-semibold leading-tight tracking-tight max-w-2xl">${item.title}</h2>
        <p class="mt-3 text-base text-white/70 leading-relaxed max-w-2xl">${item.blurb}</p>
        <div class="flex flex-wrap gap-1.5 mt-4">${tags}</div>
        <div class="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
          <a href="https://x.com/omni_puzzler" target="_blank" rel="noopener" class="invite-cta invite-cta-primary">
            DM @omni_puzzler a number →
          </a>
          <a href="${item.source}" target="_blank" rel="noopener" class="invite-cta invite-cta-secondary">
            Open the topic catalog on X
          </a>
        </div>
        <p class="mt-3 text-xs text-white/40">Open the catalog → pick a title number → DM that number. Simple.</p>
      </article>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "");
  }

  /**
   * Author identity for multi-user shelf later.
   * Prefer explicit fields: handle, displayName, avatar (or author: { handle, name, avatar }).
   * Else parse x.com/{handle}/status|i/spaces from source URL.
   */
  function authorFromItem(item) {
    const a = (item && item.author) || {};
    let handle = String(
      item.handle ||
        item.username ||
        a.handle ||
        a.username ||
        a.userName ||
        ""
    )
      .replace(/^@/, "")
      .trim();
    if (!handle && item.source) {
      const m = String(item.source).match(
        /(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})(?:\/|$)/i
      );
      if (m && m[1] && !/^(i|intent|home|explore|search|settings)$/i.test(m[1])) {
        handle = m[1];
      }
    }
    if (!handle) handle = "omni_puzzler";

    const displayName = String(
      item.displayName ||
        item.authorName ||
        a.name ||
        a.displayName ||
        (handle === "omni_puzzler" ? "thePuzzler" : handle)
    ).trim();

    // Explicit avatar wins (future: per-user CDN / pull script). Else unavatar by handle.
    const avatar =
      String(item.avatar || item.avatarUrl || a.avatar || a.image || "").trim() ||
      "https://unavatar.io/twitter/" + encodeURIComponent(handle) + "?fallback=false";

    const initials =
      (displayName.replace(/[^A-Za-z0-9]/g, " ").trim().split(/\s+/).slice(0, 2).map(function (w) {
        return w[0] || "";
      }).join("") || handle.slice(0, 2)).toUpperCase().slice(0, 2);

    return {
      handle: handle,
      handleAt: "@" + handle,
      displayName: displayName,
      avatar: avatar,
      initials: initials || "?",
    };
  }

  function avatarHtml(author) {
    // Profile image + initials fallback if CDN/unavatar fails (other users later)
    return (
      '<div class="x-card__avatar" aria-hidden="true">' +
      '<img class="x-card__avatar-img" src="' +
      escapeAttr(author.avatar) +
      '" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer" ' +
      'onerror="this.classList.add(\'is-failed\');" />' +
      '<span class="x-card__avatar-fallback">' +
      escapeHtml(author.initials) +
      "</span></div>"
    );
  }

  /** Minimal X logo (inline SVG) so cards read as X content without external icons. */
  function xMarkSvg() {
    return (
      '<svg class="x-card__xmark" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="#e7e9ea" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>' +
      "</svg>"
    );
  }

  /**
   * Featured moments from X render as X-like post / Space cards (not generic glass tiles).
   * Steward feedback: "Live Space Thread" style content should look like X.com.
   */
  function card(item) {
    if (!isDeepSource(item)) {
      return ""; // skip broken / profile-only rows
    }
    const featured = !!item.featured;
    const sk = sourceKind(item);
    const isSpace = sk === "space";
    const author = authorFromItem(item);
    const date = item.date || "";
    const kindLabel = isSpace
      ? "Space"
      : item.kind && /thread|space/i.test(item.kind)
        ? item.kind
        : item.kind || "Post";
    const cta = isSpace ? "Listen / open Space on X" : "View on X";
    const badge = isSpace
      ? '<span class="x-card__badge x-card__badge--live">Space</span>'
      : featured
        ? '<span class="x-card__badge">Best of</span>'
        : '<span class="x-card__badge">' + escapeHtml(kindLabel) + "</span>";
    const cls =
      "x-card" +
      (featured ? " x-card--featured" : "") +
      (isSpace ? " x-card--space" : "");
    // Tweet body: title as lead line, blurb as rest (X-like reading order)
    const title = escapeHtml(item.title || "");
    const blurb = escapeHtml(item.blurb || "");
    return (
      '<a href="' +
      escapeHtml(item.source) +
      '" target="_blank" rel="noopener" class="' +
      cls +
      '" aria-label="' +
      title +
      " — open on X\">" +
      '<div class="x-card__row">' +
      avatarHtml(author) +
      '<div class="min-w-0 flex-1">' +
      '<div class="x-card__meta">' +
      '<span class="x-card__name">' +
      escapeHtml(author.displayName) +
      "</span>" +
      '<span class="x-card__handle">' +
      escapeHtml(author.handleAt) +
      "</span>" +
      (date
        ? '<span class="x-card__dot" aria-hidden="true">·</span><time class="x-card__time">' +
          escapeHtml(date) +
          "</time>"
        : "") +
      badge +
      xMarkSvg() +
      "</div></div></div>" +
      '<div class="x-card__body">' +
      (title ? '<div class="x-card__body-title">' + title + "</div>" : "") +
      (blurb ? '<div class="x-card__body-blurb">' + blurb + "</div>" : "") +
      "</div>" +
      '<div class="x-card__footer">' +
      '<span class="x-card__cta">' +
      cta +
      " →</span>" +
      (item.tags && item.tags.length
        ? '<span class="text-[11px] text-[#71767b]">' +
          escapeHtml(item.tags.slice(0, 3).join(" · ")) +
          "</span>"
        : "") +
      "</div></a>"
    );
  }

  /**
   * Shelf model (product now)
   * - Featured / Articles = Puzzler static shortlist (archive-data.js), editorial order
   * - Everyone rides steward vibes — guest and member same shop window
   * - Login-time personal LLM rank: parked (multi-member later)
   * - GET /api/imi/library/search remains for deeper catalog later
   */
  var PAGE_SIZE = 6;
  var shelfState = {
    tab: "featured", // featured | articles
    page: 1,
    mode: "puzzler_static", // puzzler_static only for now
  };

  var meta = window.IMI_ARCHIVE_META || {
    trafficScope: "steward_only",
    stewardHandle: "omni_puzzler",
    refreshedAt: null,
    note: "Ride thePuzzler's curated best — not personalized rank.",
  };

  /** Build shelf slices from static archive (preserve file order = vibes order). */
  function shelfFromStatic() {
    var pins = STATIC_ARCHIVE.filter(function (x) {
      return x && x.pin;
    });
    var rest = STATIC_ARCHIVE.filter(function (x) {
      return x && !x.pin;
    });
    var featured = rest.filter(isFeaturedBest);
    var articles = rest.filter(isArticle);
    return {
      ok: true,
      version: 1,
      guest: true,
      traffic_scope: meta.trafficScope || "steward_only",
      steward_handle: meta.stewardHandle || "omni_puzzler",
      rank_method: "puzzler_static_shortlist",
      why: "Steward-curated shortlist — ride my best-for-me vibes",
      featured: featured,
      articles: articles,
      library_total: rest.length,
      note: meta.note || "Puzzler static shortlist",
      pins: pins,
    };
  }

  function ensurePuzzlerShelf() {
    // Always load static shortlist as the product shelf (no personal re-rank).
    data = STATIC_ARCHIVE.slice();
    liveShelf = shelfFromStatic();
    shelfState.mode = "puzzler_static";
    if (meta.refreshedAt || (window.IMI_ARCHIVE_META && window.IMI_ARCHIVE_META.refreshedAt)) {
      meta.refreshedAt =
        meta.refreshedAt ||
        (window.IMI_ARCHIVE_META && window.IMI_ARCHIVE_META.refreshedAt) ||
        null;
    }
    meta.note =
      "Ride @omni_puzzler best-of · static shortlist (not LLM re-rank per visitor)";
    return Promise.resolve(liveShelf);
  }

  function isArticle(item) {
    if (!item) return false;
    if (item.format === "article" || item.shelf === "articles") return true;
    var kind = String(item.kind || "").toLowerCase();
    if (/article/.test(kind)) return true;
    var tags = item.tags || [];
    return tags.some(function (t) {
      return String(t).toLowerCase() === "article" || String(t).toLowerCase() === "articles";
    });
  }

  function isFeaturedBest(item) {
    if (!item) return false;
    if (item.featured) return true;
    var tags = item.tags || [];
    return tags.some(function (t) {
      return String(t).toLowerCase() === "best";
    });
  }

  function textFilter(list, q) {
    var s = (q || "").trim().toLowerCase();
    if (!s) return list.slice();
    return list.filter(function (item) {
      var author = authorFromItem(item);
      var hay = [
        item.title,
        item.blurb,
        item.kind,
        author.handle,
        author.displayName,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return s.split(/\s+/).every(function (tok) {
        return hay.includes(tok);
      });
    });
  }

  function shelfList() {
    // Puzzler static shortlist only — preserve archive-data.js editorial order
    if (liveShelf) {
      var slice =
        shelfState.tab === "articles"
          ? liveShelf.articles || []
          : liveShelf.featured || [];
      return textFilter(slice, input && input.value);
    }
    var base = data.filter(function (x) {
      return x && !x.pin;
    });
    if (shelfState.tab === "articles") {
      base = base.filter(isArticle);
    } else {
      base = base.filter(isFeaturedBest);
    }
    // No date re-sort — steward file order is the vibe order
    return textFilter(base, input && input.value);
  }

  function paintScopeChrome() {
    var scopeEl = document.getElementById("shelf-scope-note");
    var refEl = document.getElementById("shelf-refreshed");
    var hint = document.getElementById("tab-hint");
    var scope = meta.trafficScope || "steward_only";
    var handle = meta.stewardHandle || "omni_puzzler";
    if (scopeEl) {
      if (scope === "members") {
        scopeEl.innerHTML =
          'Traffic target: <strong class="text-white/55">whole member base</strong> (when multi-author shelf is live).';
      } else {
        scopeEl.innerHTML =
          'Ride <strong class="text-white/55">@' +
          escapeHtml(handle) +
          "</strong>'s curated best — same vibes for every visitor.";
      }
    }
    if (refEl) {
      refEl.textContent = meta.refreshedAt
        ? "Shelf: " + meta.refreshedAt + " · Puzzler static shortlist"
        : "Shelf · Puzzler static shortlist (ride these vibes)";
      if (meta.note) refEl.title = meta.note;
    }
    if (hint) {
      hint.textContent =
        shelfState.tab === "articles"
          ? "Long-form trail from the same steward shortlist"
          : "Best-of Mission / poetic — steward-scored, not algorithmic";
    }
    document.querySelectorAll("[data-tab]").forEach(function (btn) {
      var on = btn.getAttribute("data-tab") === shelfState.tab;
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.classList.toggle("shelf-tab--on", on);
    });
  }

  function render() {
    if (!results) return;
    paintScopeChrome();
    var full = shelfList();
    var total = full.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    if (shelfState.page > pages) shelfState.page = pages;
    if (shelfState.page < 1) shelfState.page = 1;
    var start = (shelfState.page - 1) * PAGE_SIZE;
    var pageItems = full.slice(start, start + PAGE_SIZE);

    results.innerHTML = pageItems.map(card).join("");
    if (empty) {
      empty.classList.toggle("hidden", total > 0);
      empty.textContent =
        shelfState.tab === "articles"
          ? "No articles match this search yet. Tag rows with format:\"article\" or kind Article-style."
          : "No featured moments match. Mark featured:true or tag “best” on archive rows.";
    }

    var pager = document.getElementById("pager");
    var metaEl = document.getElementById("pager-meta");
    var pagesEl = document.getElementById("pager-pages");
    var prev = document.getElementById("pager-prev");
    var next = document.getElementById("pager-next");
    if (pager) {
      var showPager = total > PAGE_SIZE;
      pager.classList.toggle("hidden", !showPager);
      if (metaEl) {
        metaEl.textContent =
          total === 0
            ? "0 items"
            : "Showing " +
              (start + 1) +
              "–" +
              Math.min(start + PAGE_SIZE, total) +
              " of " +
              total +
              " · " +
              shelfState.tab;
      }
      if (pagesEl) pagesEl.textContent = "Page " + shelfState.page + " / " + pages;
      if (prev) prev.disabled = shelfState.page <= 1;
      if (next) next.disabled = shelfState.page >= pages;
    }

    // Invite strip: pins always (unrelated to pagination)
    var q = (input && input.value) || "";
    if (!q.trim()) paintInvite(data);
    else paintInvite(data.filter(function (x) { return x.pin; }));
  }

  function filter(q) {
    // kept for compatibility — shelfList already text-filters
    return textFilter(data, q);
  }

  if (input) {
    input.addEventListener("input", function () {
      shelfState.page = 1;
      render();
    });
  }
  document.querySelectorAll("[data-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      shelfState.tab = btn.getAttribute("data-tab") || "featured";
      shelfState.page = 1;
      render();
    });
  });
  var prevBtn = document.getElementById("pager-prev");
  var nextBtn = document.getElementById("pager-next");
  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      shelfState.page -= 1;
      render();
      var sec = document.getElementById("moments");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      shelfState.page += 1;
      render();
      var sec = document.getElementById("moments");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  paintLiveHero();
  paintInvite(data);
  // Product shelf = static shortlist only (Puzzler vibes for everyone)
  ensurePuzzlerShelf()
    .then(function () {
      paintLiveHero();
      paintInvite(data);
      render();
    })
    .catch(function () {
      render();
    });
  render();
})();
