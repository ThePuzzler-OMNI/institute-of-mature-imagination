#!/usr/bin/env python3
"""Regenerate the list section of posts.html from data/x-posts.json.

Usage (from repo root):  python3 scripts/build_posts_page.py
Only the region between <!-- POSTS:BEGIN --> and <!-- POSTS:END --> is rewritten.
Data rules: public, live X posts/Articles only; no drafts; no fabricated URLs.
"""
import html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "x-posts.json"
PAGE = ROOT / "posts.html"
e = lambda s: html.escape(str(s or ""), quote=True)


def card(item, kind="Post"):
    title = f'<h3 class="text-lg font-semibold tracking-tight mb-1">{e(item["title"])}</h3>' if item.get("title") else ""
    return f'''        <li class="post-card glass rounded-2xl p-5">
          <p class="post-meta"><time datetime="{e(item["created_at"])}">{e(item["date_label"])}</time> · @{e(item["account"])} · {kind}</p>
          {title}<p class="text-white/75 leading-relaxed">{e(item["excerpt"])}</p>
          <a class="post-link" href="{e(item["url"])}" target="_blank" rel="noopener">Open on X →</a>
        </li>'''


def section(sec_id, heading, items, kind, profile, handle):
    if not items:
        return ""
    cards = "\n".join(card(i, kind) for i in items)
    return f'''    <section id="{sec_id}" class="mb-14" aria-labelledby="{sec_id}-title">
      <h2 id="{sec_id}-title" class="text-2xl md:text-3xl font-semibold tracking-tight mb-5">{e(heading)}</h2>
      <ol class="space-y-4">
{cards}
      </ol>
      <p class="mt-5 text-sm"><a class="text-glow hover:underline" href="{e(profile)}" target="_blank" rel="noopener">See all on X · @{e(handle)} →</a></p>
    </section>'''


def build(d):
    out = []
    f = d.get("featured")
    if f:
        out.append(f'''    <section id="featured" class="mb-14" aria-labelledby="featured-title">
      <p class="field-kicker">Featured · {e(f.get("label", "Featured"))}</p>
      <h2 id="featured-title" class="sr-only">Featured post</h2>
      <div class="glass rounded-3xl p-6 md:p-8 featured-card">
        <p class="post-meta"><time datetime="{e(f["created_at"])}">{e(f["date_label"])}</time> · @{e(f["account"])}</p>
        <p class="text-white/85 leading-relaxed text-lg">{e(f["excerpt"])}</p>
        <a class="post-link" href="{e(f["url"])}" target="_blank" rel="noopener">Open the post on X →</a>
      </div>
    </section>''')
    labels = {"puzzler": "Puzzler", "unpuzzler": "Unpuzzler"}
    for key in ("puzzler", "unpuzzler"):
        a = d["accounts"].get(key)
        if not a:
            continue
        out.append(section(f"{key}-articles", f"{labels[key]} · Articles", a.get("articles", []), "Article", a["profile"], a["handle"]))
        out.append(section(f"{key}-posts", f"{labels[key]} · Posts (@{a['handle']})", a.get("posts", []), "Post", a["profile"], a["handle"]))
    out.append(f'    <p class="text-xs text-white/35">List updated {e(d.get("generated_at", "")[:10])}. Dates shown in Eastern Time. Excerpts are short; the full text lives on X.</p>')
    return "\n".join(x for x in out if x)


def main():
    d = json.loads(DATA.read_text(encoding="utf-8"))
    page = PAGE.read_text(encoding="utf-8")
    new, n = re.subn(r"<!-- POSTS:BEGIN -->.*?<!-- POSTS:END -->",
                     lambda m: "<!-- POSTS:BEGIN -->\n" + build(d) + "\n    <!-- POSTS:END -->", page, flags=re.S)
    if n != 1:
        raise SystemExit("POSTS markers not found in posts.html")
    PAGE.write_text(new, encoding="utf-8")
    print("posts.html regenerated")


if __name__ == "__main__":
    main()
