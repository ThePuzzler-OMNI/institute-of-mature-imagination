(function () {
  const data = window.IMI_ARCHIVE || [];
  const results = document.getElementById("results");
  const empty = document.getElementById("empty");
  const input = document.getElementById("q");
  const year = document.getElementById("y");
  if (year) year.textContent = String(new Date().getFullYear());

  function card(item) {
    const tags = (item.tags || [])
      .map((t) => `<span class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">${t}</span>`)
      .join(" ");
    const featured = !!item.featured;
    const isSpace = /space/i.test(item.kind || "") || /spaces\.x\.com|x\.com\/i\/spaces/i.test(item.source || "");
    const border = featured
      ? "border-accent/50 ring-1 ring-accent/30"
      : "border-white/8";
    const cta = isSpace
      ? (featured ? "Open this Space on X →" : "Open Space on X →")
      : "Open source on X →";
    const badge = featured
      ? '<span class="text-[10px] font-semibold uppercase tracking-wide text-void bg-glow/90 px-2 py-0.5 rounded-full">Featured live</span>'
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
    // Featured Spaces first
    const sorted = list.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
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
  render(data);
})();
