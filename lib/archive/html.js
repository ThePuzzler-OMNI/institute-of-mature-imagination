import { displayName, speakerNumbers } from "./transcript.js";

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CSS = `
:root { color-scheme: dark; --void:#07060f; --star:#e8e4ff; --accent:#8b5cf6; --glow:#22d3ee; --muted:rgba(232,228,255,.62); --line:rgba(255,255,255,.1); }
* { box-sizing: border-box; }
body { margin:0; min-height:100vh; font:16px/1.5 "Segoe UI", system-ui, sans-serif; color:var(--star); background:
  radial-gradient(1000px 480px at 10% -10%, rgba(139,92,246,.28), transparent 55%),
  radial-gradient(800px 420px at 100% 0%, rgba(34,211,238,.12), transparent 50%), var(--void); }
a { color: var(--glow); }
.wrap { max-width: 56rem; margin: 0 auto; padding: 1.25rem; }
header.bar { display:flex; justify-content:space-between; gap:1rem; align-items:center; padding-bottom:1rem; border-bottom:1px solid var(--line); }
.mark { display:inline-flex; width:2rem; height:2rem; align-items:center; justify-content:center; border-radius:999px; border:1px solid rgba(139,92,246,.5); color:var(--accent); font-size:.7rem; font-weight:700; text-decoration:none; }
h1 { font-size:1.6rem; line-height:1.2; margin:1.25rem 0 .4rem; }
.lede, .meta { color: var(--muted); }
.card, .panel { border:1px solid var(--line); background:rgba(255,255,255,.04); border-radius:16px; padding:1rem 1.1rem; margin:0 0 .9rem; }
.card { display:block; text-decoration:none; color:inherit; }
.card:hover { border-color: rgba(139,92,246,.45); }
.row { display:flex; flex-wrap:wrap; gap:.5rem 1rem; align-items:baseline; }
.title { font-weight:650; }
.badge { font-size:.75rem; letter-spacing:.04em; text-transform:uppercase; border:1px solid rgba(139,92,246,.45); border-radius:999px; padding:.1rem .55rem; color:var(--glow); }
.badge.private { color:#f0abfc; border-color:rgba(240,171,252,.4); }
audio { width:100%; margin:.75rem 0 1rem; }
.who { font-weight:700; color:var(--glow); }
.aka { color: var(--star); font-weight:650; }
.transcript p { margin:.55rem 0; white-space:pre-wrap; }
form.inline, .actions { display:flex; flex-wrap:wrap; gap:.6rem; align-items:center; }
button, .button { font:inherit; color:var(--void); background:var(--glow); border:0; border-radius:999px; padding:.55rem 1rem; min-height:44px; cursor:pointer; }
button.quiet { background:transparent; color:var(--star); border:1px solid var(--line); }
label { display:block; margin:.4rem 0; }
input[type="text"], input[type="password"] { width:min(100%, 24rem); font:inherit; color:var(--star); background:rgba(0,0,0,.35); border:1px solid var(--line); border-radius:10px; padding:.55rem .7rem; }
.note { color:#fda4af; }
footer { margin-top:2rem; color:var(--muted); font-size:.85rem; }
`;

function shell({ title, robots, canonical, body, publicChrome }) {
  const chrome = publicChrome
    ? `<header class="bar"><a class="mark" href="/">IMI</a><nav><a href="/spaces">Spaces</a></nav></header>`
    : `<header class="bar"><a class="mark" href="/">IMI</a><strong>Private archive</strong></header>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="robots" content="${esc(robots)}" />
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : ""}
  <link rel="icon" href="/favicon.ico" />
  ${publicChrome ? '<script src="/analytics-config.js"></script>\n  <script src="/analytics.js" defer></script>' : ""}
  <style>${CSS}</style>
</head>
<body>
  <div class="wrap">
    ${chrome}
    ${body}
    <footer>Institute of Mature Imagination</footer>
  </div>
</body>
</html>`;
}

export function loginPage({ error = "", retryAfter = 0 } = {}) {
  const message = retryAfter
    ? `<p class="note">Too many attempts. Try again in ${esc(retryAfter)} seconds.</p>`
    : error
      ? `<p class="note">${esc(error)}</p>`
      : `<p class="lede">Owner sign-in. This page is not indexed.</p>`;
  const body = `<h1>Archive</h1>${message}
    <form class="panel" method="post" action="/archive">
      <input type="text" name="username" value="owner" autocomplete="username" hidden />
      <label>Password<br /><input type="password" name="password" autocomplete="current-password" required autofocus /></label>
      <button type="submit">Sign in</button>
    </form>`;
  return shell({ title: "Archive sign-in · IMI", robots: "noindex, nofollow", body, publicChrome: false });
}

export function configPage(message) {
  const body = `<h1>Archive</h1><p class="note">${esc(message)}</p>`;
  return shell({ title: "Archive · IMI", robots: "noindex, nofollow", body, publicChrome: false });
}

function spaceCards(spaces, hrefBase, showStatus) {
  if (!spaces.length) {
    return `<p class="lede">No Spaces here yet.</p>`;
  }
  return spaces
    .map((space) => {
      const status = showStatus
        ? `<span class="badge ${space.status === "public" ? "" : "private"}">${esc(space.status || "private")}</span>`
        : "";
      return `<a class="card" href="${hrefBase}/${esc(space.id)}">
        <div class="row"><span class="title">${esc(space.title)}</span>${status}</div>
        <div class="meta">${esc(space.date)} · ${esc(space.duration)}</div>
      </a>`;
    })
    .join("");
}

export function ownerListPage({ spaces, csrf }) {
  const body = `<h1>Private Spaces archive</h1>
    <p class="lede">Every Space stays private until you approve it. Search engines are asked not to index this page.</p>
    ${spaceCards(spaces, "/archive", true)}
    <form method="post" action="/archive"><input type="hidden" name="csrf" value="${esc(csrf)}" /><input type="hidden" name="action" value="logout" /><button class="quiet" type="submit">Log out</button></form>`;
  return shell({ title: "Private archive · IMI", robots: "noindex, nofollow", body, publicChrome: false });
}

export function transcriptHtml(blocks, speakerNames) {
  if (!blocks.length) return `<p class="lede">No transcript stored.</p>`;
  return `<div class="transcript">${blocks
    .map((block) => {
      if (!block.speaker) return `<p>${esc(block.text)}</p>`;
      const aka = displayName(block.speaker, speakerNames);
      const who = aka
        ? `<span class="who">${esc(block.speaker)}</span> <span class="aka">${esc(aka)}</span>`
        : `<span class="who">${esc(block.speaker)}</span>`;
      return `<p>${who}<br />${esc(block.text)}</p>`;
    })
    .join("")}</div>`;
}

export function ownerDetailPage({ space, blocks, csrf }) {
  const audio = space.audio
    ? `<audio controls preload="none" src="/api/archive/audio/${esc(space.id)}">Audio</audio>`
    : `<p class="lede">No audio stored.</p>`;
  const speakers = speakerNumbers(blocks);
  const rename = speakers.length
    ? `<form class="panel" method="post" action="/archive/${esc(space.id)}">
        <input type="hidden" name="csrf" value="${esc(csrf)}" />
        <input type="hidden" name="action" value="rename" />
        <h2>Rename speakers</h2>
        ${speakers
          .map((label) => {
            const n = label.replace(/\D/g, "");
            const current = displayName(label, space.speaker_names);
            return `<label>${esc(label)}<br /><input type="text" name="speaker_${esc(n)}" value="${esc(current)}" maxlength="80" /></label>`;
          })
          .join("")}
        <button type="submit">Rename speakers</button>
      </form>`
    : `<p class="lede">No Speaker N labels found to rename.</p>`;
  const models = (space.models || []).length ? `<p class="meta">Models: ${esc(space.models.join(", "))}</p>` : "";
  const body = `<h1>${esc(space.title)}</h1>
    <p class="meta">${esc(space.date)} · ${esc(space.duration)} · <span class="badge ${space.status === "public" ? "" : "private"}">${esc(space.status || "private")}</span></p>
    ${models}
    ${audio}
    <div class="actions">
      <form method="post" action="/archive/${esc(space.id)}"><input type="hidden" name="csrf" value="${esc(csrf)}" /><input type="hidden" name="action" value="approve" /><button type="submit">Approve public</button></form>
      <form method="post" action="/archive/${esc(space.id)}"><input type="hidden" name="csrf" value="${esc(csrf)}" /><input type="hidden" name="action" value="make_private" /><button class="quiet" type="submit">Make private</button></form>
      <form method="post" action="/archive"><input type="hidden" name="csrf" value="${esc(csrf)}" /><input type="hidden" name="action" value="logout" /><button class="quiet" type="submit">Log out</button></form>
    </div>
    ${rename}
    <h2>Transcript</h2>
    ${transcriptHtml(blocks, space.speaker_names)}
    <p><a href="/archive">All Spaces</a></p>`;
  return shell({ title: `${space.title} · private archive`, robots: "noindex, nofollow", body, publicChrome: false });
}

export function publicListPage({ spaces }) {
  const body = `<h1>Spaces</h1>
    <p class="lede">Approved public recordings. Private Spaces are not listed.</p>
    ${spaceCards(spaces, "/spaces", false)}`;
  return shell({
    title: "Spaces · Institute of Mature Imagination",
    robots: "index, follow",
    canonical: "https://instituteofmatureimagination.org/spaces",
    body,
    publicChrome: true,
  });
}

export function publicDetailPage({ space, blocks }) {
  const audio = space.audio
    ? `<audio controls preload="none" src="/api/spaces/audio/${esc(space.id)}">Audio</audio>`
    : `<p class="lede">No audio stored.</p>`;
  const models = (space.models || []).length ? `<p class="meta">Models: ${esc(space.models.join(", "))}</p>` : "";
  const body = `<h1>${esc(space.title)}</h1>
    <p class="meta">${esc(space.date)} · ${esc(space.duration)}</p>
    ${models}
    ${audio}
    <h2>Transcript</h2>
    ${transcriptHtml(blocks, space.speaker_names)}
    <p><a href="/spaces">All public Spaces</a></p>`;
  return shell({
    title: `${space.title} · Spaces`,
    robots: "index, follow",
    canonical: `https://instituteofmatureimagination.org/spaces/${space.id}`,
    body,
    publicChrome: true,
  });
}

export function missingPage({ publicChrome = false } = {}) {
  const body = `<h1>Not available</h1><p>This Space is not available.</p>${
    publicChrome ? '<p><a href="/spaces">Public Spaces</a></p>' : '<p><a href="/archive">Private archive</a></p>'
  }`;
  return shell({
    title: "Not available · IMI",
    robots: "noindex, nofollow",
    body,
    publicChrome,
  });
}
