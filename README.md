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

## Get OMNI

Invite order on IMI: the Lord / Creator (One pinnacle) · Mission · OMNI Grok-Bot as door/servant.

- https://onemissionnetworkandinstitute.org
- https://x.ai/bot/HAIGA0nUYgv85CtV5SMWa

The bot may take the question; the archive stays with the steward. Tool, not throne. Not a marketplace swarm.

## Status

- **v0.1** static site with seed archive + client search  
- Home / About / Videos carry a mid-page OMNI Grok-Bot invite (Lord · Mission · door/servant)
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

## X Spaces archive

Public pages stay static. Approved Spaces are served from `/spaces`. The owner archive at `/archive` is private. **No transcripts, audio, or archive index are stored in this repo.** Those bytes live in a **private** Vercel Blob store.

### Environment variables

Set these in the Vercel project `institute-of-mature-imagination` for **Preview** first. Do not put values in git, in this README, or in a commit. `.env.example` lists the names only.

| Name | Purpose |
|------|---------|
| `BLOB_READ_WRITE_TOKEN` | Read-write token for the private Blob store. Create the store with private access and connect it to this project. The index, `meta.json`, `transcript.txt`, `transcript.srt`, `full.json`, and audio are written only there. |
| `ARCHIVE_OWNER_SECRET` | Owner password. It is also the HMAC key for the `HttpOnly` session cookie (`imi_archive_session`). Use a long random string. There is no separate user database. |
| `INGEST_TOKEN` | Bearer token for `POST /api/archive/ingest`. |

There is no existing login in this repo. The archive adds an owner-only password check.

### Routes

- `GET /archive` — owner login, then a list of every Space (title, date, duration, status). `noindex`. Login is rate limited to 5 failures per 15 minutes per IP.
- `GET /archive/:id` — audio player, transcript with `Speaker N` labels, and buttons **Approve public**, **Make private**, and **Rename speakers**.
- `POST /api/archive/ingest` — `Authorization: Bearer <INGEST_TOKEN>` and `multipart/form-data` parts named `meta.json`, `transcript.txt`, `transcript.srt`, `full.json`, and `audio`. `meta.json` fields are `title`, `date`, `duration`, `models`, `status`, `approved_public`. Ingest always stores `status: "private"` and `approved_public: false`, including on re-ingest. An optional `id` slug updates that Space and takes it back to private.
- `GET /spaces` — public list of Spaces whose `approved_public` is exactly `true`.
- `GET /spaces/:id` and `GET /api/spaces/audio/:id` — transcript and audio for an approved Space. Anything else, including a Space with `status: "public"` but `approved_public` not `true`, is **404 on the server**. An owner cookie does not unlock those URLs.

`/.git` and other dot paths return 404 before static files are considered. `/api/archive` does not list objects. Blob pathnames are not public URLs.

Vercel function request bodies are capped at 4.5MB. Send text files plus a short audio file in one multipart request. For a longer recording, send the text files first, then upload audio straight to private Blob:

```bash
INGEST_TOKEN=... node scripts/ingest-space.mjs https://<preview-host> ./space-directory
```

The directory is local only. The script posts `meta.json`, `transcript.txt`, `transcript.srt`, and `full.json`, and if the audio is large it uses a bearer-authenticated client upload to `spaces/<id>/audio.<ext>`.

### Checks

```bash
npm install
npm test
npm run verify
```

### Preview

This change must not be merged from here and must not be promoted to production. The pull request opens a Vercel **Preview** deployment for this branch.

1. On the Vercel project, add the three variables above to the **Preview** environment only, until you intend to go live.
2. Redeploy that preview so the functions can read them. Production is left unchanged.
3. `POST /api/archive/ingest` at the preview host with the bearer token.
4. Open `https://<preview>/archive`, sign in with `ARCHIVE_OWNER_SECRET`, and use **Approve public** on one Space.
5. Confirm `https://<preview>/spaces` lists only that Space, the audio plays, and an unapproved id returns 404.
6. Confirm the preview response for `/archive` includes `X-Robots-Tag: noindex` and `https://<preview>/.git/HEAD` is 404.

The preview URL is the Vercel check on the pull request. It is not `instituteofmatureimagination.org`.
