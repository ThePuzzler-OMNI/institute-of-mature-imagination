/**
 * IMI Featured Moments — steward-curated best of @omni_puzzler
 * -----------------------------------------------------------
 * PURPOSE NOW:
 *   Drive traffic to the most poetic / unique / Mission-aligned posts —
 *   NOT “most viewed,” NOT a full firehose.
 *
 * RULES:
 *   - Every public card MUST have source = a real post or Space URL
 *     (…/status/… or …/i/spaces/…), never bare https://x.com/omni_puzzler alone.
 *   - Editorial: The Puzzler / steward picks “best of.” Quality over volume.
 *
 * SCAN HONESTY (2026-08-01):
 *   - This shelf is NOT a full 2026 account export.
 *   - Built from: (1) dedication / Space catalog posts already known,
 *     (2) partial semantic retrieval of @omni_puzzler posts in 2026,
 *     (3) steward taste (Mission / poetic / unique).
 *   - X keyword timeline dumps (from:omni_puzzler) were incomplete in tooling.
 *   - Highlights & Articles: include when we have status/article URLs;
 *     full Highlights tab + long-form Articles need account export or API scan
 *     when steward provides archived files / API access.
 *
 * LATER (when archive files arrive):
 *   - Import full export / third-party archive into a members archive.
 *   - Automate thePuzzler + mission members into a clean OMNI archive.
 *   - Architecture must be proofed first — do not thrash a half-pipe here.
 */
window.IMI_ARCHIVE = [
  /* —— Pin: invitation —— */
  {
    id: "pin-request-space",
    title: "Request Space time — pick a topic, DM a number",
    date: "2026-07-27",
    tags: ["spaces", "titles", "request", "host", "menu"],
    blurb:
      "Want real Space time — not a vague someday? Open the topic catalog, pick a number, and DM @omni_puzzler that number. Guests speak first; host speaks last. Chill presence. God stuff welcome.",
    source: "https://x.com/omni_puzzler/status/2081550590174233015",
    kind: "Invite",
    pin: true,
  },

  /* —— Best-of: dedication / IMI vision (OMNI Vision posts) —— */
  {
    id: "post-dad-dedication",
    title: "This is for you, Dad — a dedication made visible",
    date: "2026-07-31",
    tags: ["dedication", "father", "imi", "vision", "best"],
    blurb:
      "Homage and public stewardship: a father’s idea held long enough for others to meet it. Institute of Mature Imagination.org.",
    source: "https://x.com/omni_puzzler/status/2083325719023649261",
    kind: "Vision post",
    featured: true,
  },
  {
    id: "post-inheritance-drive",
    title: "The inheritance was the drive — the kingdom had to be redrawn",
    date: "2026-07-31",
    tags: ["inheritance", "drive", "mission", "best", "poetic"],
    blurb:
      "What was given was not a finished map — it was the will to keep drawing. Mature imagination as fidelity under redraw.",
    source: "https://x.com/omni_puzzler/status/2083325235265208832",
    kind: "Vision post",
    featured: true,
  },
  {
    id: "post-dream-alone",
    title: "When the dream is alive in you, but seemingly no one else near you",
    date: "2026-07-31",
    tags: ["solitude", "fidelity", "archive", "best", "poetic"],
    blurb:
      "Fidelity does not wait for a crowd. Archive makes solitude shareable without sales — the IMI spirit in one frame.",
    source: "https://x.com/omni_puzzler/status/2083193783303192771",
    kind: "Vision post",
    featured: true,
  },

  /* —— Best-of: Mission statements (2026 partial scan) —— */
  {
    id: "post-steward-of-life",
    title: "Eden or Hell — I choose to be a Steward of life",
    date: "2026-07-28",
    tags: ["mission", "steward", "creator", "children", "best"],
    blurb:
      "A monument to life for every child — laboratory of music, possibility, and wonder — not a concrete jungle. Current best One Mission statement he could make that day.",
    source: "https://x.com/omni_puzzler/status/2082023799202177203",
    kind: "Mission statement",
    featured: true,
  },
  {
    id: "post-gardens-energy",
    title: "Tending the gardens — energy conversion with intention",
    date: "2026-07-26",
    tags: ["gardens", "mission", "imagination", "health", "best"],
    blurb:
      "One Mission: imagination, spiritual health, biological health, physical capability, emotional intelligence — guiding this star system toward eternity. As far as he can see for now.",
    source: "https://x.com/omni_puzzler/status/2081430994112991416",
    kind: "Mission statement",
    featured: true,
  },
  {
    id: "post-christ-song",
    title: "Was He leading me with song?",
    date: "2026-07-27",
    tags: ["faith", "poetic", "christ", "life", "best"],
    blurb:
      "Nerd years, rollercoaster, then life given to Christ. Curious grace: without fretting, without so much beer — seeking to be in tune with His tune toward new moons.",
    source: "https://x.com/omni_puzzler/status/2081778124421747011",
    kind: "Poetic post",
  },
  {
    id: "post-master-prompt",
    title: "Execute the master prompt — then carry on the five lights",
    date: "2026-08-01",
    tags: ["grok", "prompt", "physics", "faith", "family", "finance", "philosophy", "best"],
    blurb:
      "Physics, Faith, Family, Finance, and Philosophy as guiding light to life, liberty, and the pursuit of happiness. Launch path via Intek Space.",
    source: "https://x.com/omni_puzzler/status/2083361449691275423",
    kind: "Launch post",
    featured: true,
  },
  {
    id: "post-space-catalog",
    title: "Space time is real — catalog, number, DM",
    date: "2026-07-27",
    tags: ["spaces", "presence", "host", "mission", "best"],
    blurb:
      "The practical door into presence: topics listed, a number chosen, a DM sent. Meetings of the mind you can still open as they happened.",
    source: "https://x.com/omni_puzzler/status/2081550590174233015",
    kind: "X post",
  },

  /*
   * STILL MISSING UNTIL FULL EXPORT / API SCAN:
   * - Complete 2026 timeline (keyword from: scan was empty in tooling)
   * - All X Highlights (need Highlights list or export)
   * - All long-form X Articles (need article URLs from export)
   * Steward: paste additional status/article URLs here anytime, or drop archive files
   * for a later members-archive pipeline.
   */
];
