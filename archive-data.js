/**
 * IMI Featured Moments — steward-curated best of @omni_puzzler
 * -----------------------------------------------------------
 * PURPOSE NOW:
 *   Drive traffic to the most poetic / unique / Mission-aligned posts —
 *   NOT “most viewed,” NOT a full firehose.
 *
 * PULL (2026-08-01):
 *   Azure App Service X credentials (OAuth1 user) →
 *   scripts/pull_x_timeline_for_imi.py → 1477 tweets (mostly 2026) →
 *   steward-scored shortlist → this shelf.
 *
 * RULES:
 *   - Every card: real …/status/… or …/i/spaces/… URL (never bare profile).
 *   - Editorial: Mission / poetic / unique — not vanity metrics.
 *
 * LATER: full archive import when steward’s external archive files arrive;
 *   then automate thePuzzler + mission members (architecture first).
 */
window.IMI_ARCHIVE = [
  /* —— Pin: invitation —— */
  {
    id: "pin-request-space",
    title: "Request Space time — pick a topic, DM a number",
    date: "2026-07-27",
    tags: ["spaces", "titles", "request", "host", "menu"],
    blurb:
      "Want real Space time — not a vague someday? Open the topic catalog, pick a number, and DM @omni_puzzler that number. Guests speak first; host speaks last.",
    source: "https://x.com/omni_puzzler/status/2081550590174233015",
    kind: "Invite",
    pin: true,
  },

  /* —— Best of: dedication / IMI —— */
  {
    id: "post-dad-dedication",
    title: "This is for you, Dad",
    date: "2026-07-31",
    tags: ["dedication", "father", "imi", "best"],
    blurb: "Institute of Mature Imagination .org — a dedication made visible for the public record.",
    source: "https://x.com/omni_puzzler/status/2083325719023649261",
    kind: "Vision post",
    featured: true,
  },
  {
    id: "post-inheritance-drive",
    title: "The inheritance was the drive",
    date: "2026-07-31",
    tags: ["inheritance", "drive", "mission", "best", "poetic"],
    blurb: "The kingdom had to be redrawn. What was given was not a finished map — it was the will to keep drawing.",
    source: "https://x.com/omni_puzzler/status/2083325235265208832",
    kind: "Vision post",
    featured: true,
  },
  {
    id: "post-dream-alone",
    title: "When the dream is alive in you alone",
    date: "2026-07-31",
    tags: ["solitude", "fidelity", "archive", "best", "poetic"],
    blurb: "Fidelity does not wait for a crowd. Archive makes solitude shareable without sales.",
    source: "https://x.com/omni_puzzler/status/2083193783303192771",
    kind: "Vision post",
    featured: true,
  },

  /* —— Best of: Mission statements (Azure timeline) —— */
  {
    id: "post-master-prompt",
    title: "Execute the master prompt — five lights",
    date: "2026-08-01",
    tags: ["grok", "physics", "faith", "family", "finance", "philosophy", "best"],
    blurb:
      "Physics, Faith, Family, Finance, and Philosophy as guiding light to life, liberty, and the pursuit of happiness. Launch via Intek Space.",
    source: "https://x.com/omni_puzzler/status/2083361449691275423",
    kind: "Launch post",
    featured: true,
  },
  {
    id: "post-gardens-energy",
    title: "Tending the gardens — energy with intention",
    date: "2026-07-26",
    tags: ["gardens", "mission", "imagination", "best"],
    blurb:
      "One Mission: imagination, spiritual health, biological health, physical capability, emotional intelligence — guiding this star system toward eternity.",
    source: "https://x.com/omni_puzzler/status/2081430994112991416",
    kind: "Mission statement",
    featured: true,
  },
  {
    id: "post-calling-burning",
    title: "One Mission Network and Institute — the calling",
    date: "2026-05-01",
    tags: ["mission", "calling", "institute", "best"],
    blurb:
      "It’s the calling that’s been burning for years. Bigger than one person. One Mission Network and Institute named in public.",
    source: "https://x.com/omni_puzzler/status/2050291260645351770",
    kind: "Mission statement",
    featured: true,
  },
  {
    id: "post-our-one-mission",
    title: "Our One Mission — a billion years from now",
    date: "2026-05-06",
    tags: ["mission", "grok", "life", "eternity", "best"],
    blurb:
      "Late-night question to Grok: if all biological life ends, what was the mission? A long arc of purpose under the miracle spark of life.",
    source: "https://x.com/omni_puzzler/status/2051902184611054078",
    kind: "Mission statement",
    featured: true,
  },
  {
    id: "post-christ-song",
    title: "Was He leading me with song?",
    date: "2026-07-27",
    tags: ["faith", "poetic", "christ", "best"],
    blurb:
      "Nerd years, rollercoaster, then life given to Christ. Curious grace — seeking to be in tune with His tune toward new moons.",
    source: "https://x.com/omni_puzzler/status/2081778124421747011",
    kind: "Poetic post",
  },
  {
    id: "post-let-us-cook",
    title: "Let Us Cook (together)",
    date: "2026-07-07",
    tags: ["poetic", "earth", "life", "best"],
    blurb: "Feel the matter beneath your feet. Feel the life, the heat and the wind. With us — cook.",
    source: "https://x.com/omni_puzzler/status/2074413327325729122",
    kind: "Poetic post",
  },
  {
    id: "post-park-bench",
    title: "Park bench in my mind — late night into SpaceX",
    date: "2026-07-07",
    tags: ["poetic", "space", "night", "best"],
    blurb: "Chilling on a park bench in the mind, typing into space. Perhaps take off into space — Father, hear from earth.",
    source: "https://x.com/omni_puzzler/status/2074384075624775760",
    kind: "Poetic post",
  },
  {
    id: "post-debt-chains",
    title: "Debt is the modern chain",
    date: "2026-07-05",
    tags: ["finance", "freedom", "education", "mission", "best"],
    blurb:
      "Born into financial slavery. Debt keeps people from true freedom — the problem One Mission education and life design keep facing.",
    source: "https://x.com/omni_puzzler/status/2073882540499140893",
    kind: "Thesis",
  },
  {
    id: "post-mirror-grok",
    title: "Grok is a super power — load Mirror-Grok",
    date: "2026-05-28",
    tags: ["grok", "mirror", "tools", "best"],
    blurb: "How to load thePuzzler’s mirror-Grok into a Grok conversation — practical door into the stack.",
    source: "https://x.com/omni_puzzler/status/2059825439388889526",
    kind: "Tool post",
  },
  {
    id: "post-flow-of-light-3",
    title: "The Flow of Light – Part 3",
    date: "2026-05-11",
    tags: ["physics", "light", "article", "best"],
    blurb:
      "Long-form sitting with an image all week: light doesn’t just travel — it flows. Article-style mission physics.",
    source: "https://x.com/omni_puzzler/status/2054140712959037663",
    kind: "Article-style",
    featured: true,
  },
  {
    id: "post-no-particles",
    title: "Come follow me — check out my articles",
    date: "2026-07-16",
    tags: ["physics", "articles", "journey", "best"],
    blurb:
      "Human journey invitation: articles arguing there are no particles — only massive energy patterns. Entry to the long-form trail.",
    source: "https://x.com/omni_puzzler/status/2077833473620897960",
    kind: "Articles pointer",
  },
  {
    id: "post-kids-wanted",
    title: "What we always wanted to build with our parents",
    date: "2026-07-31",
    tags: ["family", "omnibot", "childhood", "best", "poetic"],
    blurb: "Some of us just want what we always wanted to build with our mothers and fathers when we were kids.",
    source: "https://x.com/omni_puzzler/status/2083190327335096468",
    kind: "Poetic post",
  },
  {
    id: "post-ecosystem-crying",
    title: "This ecosystem is dying — the gods are crying",
    date: "2026-07-28",
    tags: ["poetic", "ecology", "breath", "best"],
    blurb: "Look at what we’ve poured our breath into. A hard, poetic look at consumption and stewardship.",
    source: "https://x.com/omni_puzzler/status/2082145630403604798",
    kind: "Poetic post",
  },
];
