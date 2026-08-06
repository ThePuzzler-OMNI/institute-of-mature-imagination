# Institute of Mature Imagination (IMI)

**Domain:** https://instituteofmatureimagination.org (also .com)  
**Path on PC:** `product/_w2_push/imi/`  
**GitHub:** `ThePuzzler-OMNI/institute-of-mature-imagination`

## What this is

Searchable, trustworthy archive surface for **X Spaces** and public conversation records — father's idea, stewarded by thePuzzler. Sister to One Mission and Intek Space.

## Network template kit (Q-NET-ADOPT-IMI · 2026-08-05)

Aligned to `product/docs/NETWORK_TEMPLATE_KIT_v1_2026-08-05.md`:

| Rule | IMI |
|------|-----|
| `--page-max: 56rem` | `css/page-layout.css` |
| Explicit chrome CSS | `js/site-chrome.js` (not Tailwind-only hamburger) |
| Desktop hamburger always on | yes |
| Sisters omit self | registry + runtime filter |
| Accent | void / violet accent / cyan glow (not hive, not apple) |

Smoke: https://instituteofmatureimagination.org/ · desktop hamburger · Escape closes menu · footer sisters = OM · Intek · Foundation · Exchange (no IMI self).

## Status

- **v0.1** static site with seed archive + client search  
- Online @grok described a site in chat (2026-07-25) but **never wrote files** — this folder is the real source of truth  
- Deploy: Vercel import this repo → attach custom domain in Vercel → point GoDaddy DNS

## Local preview

Open `index.html` in a browser, or:

```bash
npx --yes serve .
```

## Deploy (steward / Build)

1. Repo pushed to GitHub  
2. vercel.com → New Project → Import Git repo  
3. Root directory = repo root (this folder)  
4. Deploy → Domains → add `instituteofmatureimagination.org`  
5. GoDaddy DNS: CNAME/A records Vercel shows  

Build Grok does **not** have your Vercel password; empty Vercel + “connected to Grok” ≠ file push.

## Grok web cook (preferred for public HTML)

| Item | Value |
|------|--------|
| GitHub | `ThePuzzler-OMNI/institute-of-mature-imagination` |
| Deploy | Vercel ← push `main` |
| Steward UI | One Mission Cmd Cntr → **Sites** → IMI card → Copy prompt |
| Rule | Public files only · no secrets · **this site only** in that chat |

See workspace `docs/SITES_GROK_WEB_COOK.md`.
