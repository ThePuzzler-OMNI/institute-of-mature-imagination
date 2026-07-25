# Institute of Mature Imagination (IMI)

**Domain:** https://instituteofmatureimagination.org (also .com)  
**Path on PC:** `sites/imi/` under One Mission Grok workspace  
**GitHub (when created):** `ThePuzzler-OMNI/institute-of-mature-imagination`

## What this is

Searchable, trustworthy archive surface for **X Spaces** and public conversation records — father's idea, stewarded by thePuzzler. Sister to One Mission and Intek Space.

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
