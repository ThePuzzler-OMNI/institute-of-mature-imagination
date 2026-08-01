(function () {
  const data = window.IMI_ARCHIVE || [];
  const results = document.getElementById("results");
  const empty = document.getElementById("empty");
  const input = document.getElementById("q");
  const inviteStrip = document.getElementById("invite-strip");
  const year = document.getElementById("y");
  if (year) year.textContent = String(new Date().getFullYear());

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
    if (!feat) {
      el.href = "https://x.com/omni_puzzler";
      const titleEl = el.querySelector("[data-live-title]");
      const blurbEl = el.querySelector("[data-live-blurb]");
      if (titleEl) titleEl.textContent = "Best of @omni_puzzler";
      if (blurbEl) blurbEl.textContent = "Featured moments below link to real posts — curated for Mission, not vanity metrics.";
      return;
    }
    el.href = feat.source;
    const titleEl = el.querySelector("[data-live-title]");
    const blurbEl = el.querySelector("[data-live-blurb]");
    if (titleEl) titleEl.textContent = feat.title || "Featured";
    if (blurbEl) blurbEl.textContent = feat.blurb || "Open on X.";
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

  function card(item) {
    if (!isDeepSource(item)) {
      return ""; // skip broken / profile-only rows
    }
    const tags = (item.tags || [])
      .map((t) => `<span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">${t}</span>`)
      .join(" ");
    const featured = !!item.featured;
    const sk = sourceKind(item);
    const border = featured
      ? "border-accent/50 ring-1 ring-accent/30"
      : "border-white/8";
    const cta =
      sk === "space"
        ? "Open this Space on X →"
        : sk === "post"
          ? "Open this post on X →"
          : "Open on X →";
    const badge = featured
      ? '<span class="text-[10px] font-semibold uppercase tracking-wide text-void bg-glow/90 px-2 py-0.5 rounded-full">Best of</span>'
      : "";
    return `
      <article class="glass card-hover rounded-2xl p-5 flex flex-col gap-3 ${border}">
        <div class="flex items-start justify-between gap-2">
          <span class="text-[11px] text-glow/80">${item.kind || "Moment"}</span>
          <div class="flex items-center gap-2">
            ${badge}
            <time class="text-[11px] text-white/35">${item.date || ""}</time>
          </div>
        </div>
        <h3 class="font-semibold leading-snug">${item.title}</h3>
        <p class="text-sm text-white/55 leading-relaxed flex-1">${item.blurb}</p>
        <div class="flex flex-wrap gap-1.5">${tags}</div>
        <a href="${item.source}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-sm font-medium ${featured ? "text-glow" : "text-accent"} hover:underline mt-1">${cta}</a>
      </article>`;
  }

  function render(list) {
    if (!results) return;
    // Pinned items live in the invite strip — not the archive grid
    const rest = list.filter((x) => !x.pin);
    const sorted = rest.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    results.innerHTML = sorted.map(card).join("");
    if (empty) empty.classList.toggle("hidden", sorted.length > 0);
    const q = (input && input.value) || "";
    if (!q.trim()) {
      paintInvite(data);
    } else {
      const pins = list.filter((x) => x.pin);
      paintInvite(pins.length ? pins : []);
    }
  }

  function filter(q) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return data.slice();
    return data.filter((item) => {
      const hay = [item.title, item.blurb, item.kind, ...(item.tags || [])].join(" ").toLowerCase();
      return s.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }

  if (input) {
    input.addEventListener("input", () => render(filter(input.value)));
  }
  paintLiveHero();
  paintInvite(data);
  render(data);
})();
