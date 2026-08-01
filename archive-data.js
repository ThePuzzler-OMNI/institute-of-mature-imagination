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
 * LATER (when archive files arrive):
 *   - Import full export / third-party archive into a members archive.
 *   - Automate thePuzzler + mission members into a clean OMNI archive.
 *   - Architecture must be proofed first — do not thrash a half-pipe here.
 *
 * Father’s idea: trusted human moments, as they happened.
 */
window.IMI_ARCHIVE = [
  /* —— Pin: invitation (not a moment tile; invite strip) —— */
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

  /* —— Best-of posts (poetic / Mission / unique) — each links to a real status —— */
  {
    id: "post-dad-dedication",
    title: "This is for you, Dad — a dedication made visible",
    date: "2026-07-31",
    tags: ["dedication", "father", "imi", "vision", "best"],
    blurb:
      "Homage and public stewardship: a father’s idea held long enough for others to meet it. Not private biography — a dedication for the record.",
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
   * PLACEHOLDERS FOR STEWARD CURATION (replace source with status URLs only):
   * When you have a best-of list, paste real https://x.com/omni_puzzler/status/… links.
   * Until then we do not invent IDs or point cards at the bare profile.
   *
   * Future full archive: import from your external archive files → separate
   * members archive surface once architecture is proofed.
   */
];
