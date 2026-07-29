(function () {
  const data = window.IMI_ARCHIVE || [];
  const results = document.getElementById("results");
  const empty = document.getElementById("empty");
  const input = document.getElementById("q");
  const year = document.getElementById("y");
  if (year) year.textContent = String(new Date().getFullYear());

  /** Hero “Featured Space” card — SSOT is archive-data.js item with featured:true */
  function paintLiveHero() {
    const el = document.getElementById("live-space");
    if (!el) return;
    const feat = data.find((x) => x && x.featured && x.source) || data.find((x) => /spaces/i.test(x.source || ""));
    if (!feat) return;
    el.href = feat.source;
    const titleEl = el.querySelector("[data-live-title]");
    const blurbEl = el.querySelector("[data-live-blurb]");
    if (titleEl) titleEl.textContent = feat.title || "Featured Space";
    if (blurbEl) blurbEl.textContent = feat.blurb || "Open the real room on X.";
  }

  function card(item) {
    const tags = (item.tags || [])
      .map((t) => `<span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">${t}</span>`)
      .join(" ");
    const featured = !!item.featured;
    const pinned = !!item.pin;
    const isSpace = /space/i.test(item.kind || "") || /spaces\.x\.com|x\.com\/i\/spaces/i.test(item.source || "");
    const border = featured
      ? "border-accent/50 ring-1 ring-accent/30"
      : pinned
      ? "border-accent/35 ring-1 ring-accent/20"
      : "border-white/8";
    const cta = isSpace
      ? (featured ? "Open this Space on X →" : "Open Space on X →")
      : pinned
      ? "Open catalog on X →"
      : "Open source on X →";
    const badge = featured
      ? '<span class="text-[10px] font-semibold uppercase tracking-wide text-void bg-glow/90 px-2 py-0.5 rounded-full">Featured live</span>'
      : pinned
      ? '<span class="text-[10px] font-semibold uppercase tracking-wide text-void bg-accent/90 px-2 py-0.5 rounded-full">Start here</span>'
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
        <a href="${item.source}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-sm font-medium ${featured || pinned ? "text-glow" : "text-accent"} hover:underline mt-1">${cta}</a>
      </article>`;
  }

  function render(list) {
    if (!results) return;
    // Pinned first, then featured Spaces, then rest (archive order)
    const sorted = list.slice().sort((a, b) => {
      const pin = (b.pin ? 1 : 0) - (a.pin ? 1 : 0);
      if (pin) return pin;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
    results.innerHTML = sorted.map(card).join("");
    if (empty) empty.classList.toggle("hidden", list.length > 0);
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
  render(data);
})();
