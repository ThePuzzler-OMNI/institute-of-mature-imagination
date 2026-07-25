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
    return `
      <article class="glass card-hover rounded-2xl p-5 flex flex-col gap-3">
        <div class="flex items-start justify-between gap-2">
          <span class="text-[11px] text-glow/80">${item.kind || "Moment"}</span>
          <time class="text-[11px] text-white/35">${item.date || ""}</time>
        </div>
        <h3 class="font-semibold leading-snug">${item.title}</h3>
        <p class="text-sm text-white/55 leading-relaxed flex-1">${item.blurb}</p>
        <div class="flex flex-wrap gap-1.5">${tags}</div>
        <a href="${item.source}" target="_blank" rel="noopener" class="text-xs text-accent hover:underline mt-1">Open source on X →</a>
      </article>`;
  }

  function render(list) {
    if (!results) return;
    results.innerHTML = list.map(card).join("");
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
