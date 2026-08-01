import json
import re
from collections import Counter
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "data" / "x_timeline_omni_puzzler.json"
data = json.loads(p.read_text(encoding="utf-8"))
tweets = data["tweets"]
print("total", len(tweets), "auth", data.get("auth"))
yc = Counter((t.get("created_at") or "")[:4] for t in tweets)
print("years", dict(yc))
t2026 = [t for t in tweets if (t.get("created_at") or "").startswith("2026")]
print("2026", len(t2026))

kw = re.compile(
    r"\b(mission|father|dad|god|christ|garden|space|steward|imagination|imi|faith|family|"
    r"physics|philosophy|life|eden|creator|children|peace|jesus|grok|archive|record|"
    r"presence|love|liberty|happiness)\b",
    re.I,
)


def score(t):
    text = t.get("text") or ""
    s = 0
    if len(text) > 120:
        s += 2
    if len(text) > 220:
        s += 2
    if len(text) > 400:
        s += 2
    s += min(5, len(kw.findall(text)))
    m = t.get("metrics") or {}
    s += min(2, int(m.get("bookmark_count") or 0))
    s += min(1, int(m.get("like_count") or 0) // 2)
    if text.startswith("@") and len(text) < 80:
        s -= 5
    if text.startswith("@grok") and len(text) < 120:
        s -= 2
    if not text.startswith("@"):
        s += 1
    if re.search(r"(Dad|Father|IMI|Institute|Mission|Steward|Eden|Mature)", text):
        s += 3
    if re.search(r"https?://", text):
        s += 1
    return s


ranked = sorted(t2026, key=score, reverse=True)
print("\n=== TOP 30 candidates ===")
for t in ranked[:30]:
    sc = score(t)
    text = (t.get("text") or "").replace("\n", " ")[:115]
    print(f"{sc:2d} {t['created_at'][:10]} {t['id']} {text}")

arts = [
    t
    for t in t2026
    if re.search(r"article|/i/articles|twitter\.com/i/article", (t.get("text") or ""), re.I)
]
print("\narticle-ish", len(arts))
for t in arts[:15]:
    print(t["id"], (t.get("text") or "").replace("\n", " ")[:120])

# write shortlist
out = Path(__file__).resolve().parents[1] / "data" / "x_bestof_shortlist.json"
short = [
    {
        "id": t["id"],
        "score": score(t),
        "created_at": t.get("created_at"),
        "url": t.get("url"),
        "text": t.get("text"),
        "metrics": t.get("metrics"),
    }
    for t in ranked[:40]
]
out.write_text(json.dumps(short, indent=2, ensure_ascii=False), encoding="utf-8")
print("wrote", out)
