# IMI data (local / steward)

- `x_timeline_omni_puzzler.json` — produced by `scripts/pull_x_timeline_for_imi.py` using Azure X env. **Not committed** (large).
- `x_bestof_shortlist.json` — ranked candidates for curation. Not committed.
- `x-posts.json` — curated public X posts and Articles shown on `/posts`. Regenerate the list in `posts.html` with `python3 scripts/build_posts_page.py` (idempotent; rewrites only the region between `<!-- POSTS:BEGIN -->` and `<!-- POSTS:END -->`).

Public shelf SSOT for the site remains `../archive-data.js`.
