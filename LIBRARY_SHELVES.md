# IMI shelves — Featured · Articles · Library

## Product law (current)

| Surface | Job | Data | When loaded |
|---------|-----|------|-------------|
| **Featured** | Puzzler “best for me” shop window | **Static shortlist** `archive-data.js` (featured / tag `best`) | Every page — **editorial order**, same for everyone |
| **Articles** | Long-form trail | Same static file (`format:article` / article tags) | Same shelf, other tab |
| **Full library** (later) | Warehouse / deeper search | App Service `GET /api/imi/library/search` | Search-on-demand — **not** the default shop window |

**Everyone rides the Puzzler’s curated vibes.** Guest and member see the same steward shortlist. No per-visitor LLM re-rank until multi-member and `IMI_SHELF_PERSONALIZE=1`.

---

## Traffic / who is “best for”

| Phase | Who appears | Who “best” is scored for |
|-------|-------------|---------------------------|
| **Now (steward only)** | @omni_puzzler | **You** — steward-scored shortlist. Visitors ride your best-for-me vibes. |
| **Members live (later)** | Puzzler + Mission + member authors | Optional personal rank (`IMI_SHELF_PERSONALIZE`) between Puzzler / Mission / self |

Refresh Featured: re-pull X → re-score → update `archive-data.js` + seed → bump `meta.refreshedAt`. No live “best algorithm” in the browser.

---

## API (available; not the default UI shelf)

| Endpoint | Role |
|----------|------|
| `GET /api/imi/library/search` | Full accessible set (seed now; deeper later) |
| `GET /api/imi/library/meta` | Counts / notes |
| `GET /api/imi/shelf/guest` | Same steward shortlist as API mirror of seed |
| `GET/POST /api/imi/shelf*` | Member cache; **defaults to puzzler shortlist**, not personal LLM |

App Service flat zip: `imi_shelf.py` + `library_seed_embed.py`. Live: `0.52.0-imi-shelf`.

---

## UI

- Tabs **Featured | Articles** over static shortlist.  
- Pagination over that slice.  
- Copy: “Ride @omni_puzzler curated best — same vibes for every visitor.”
