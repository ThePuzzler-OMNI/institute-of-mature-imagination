export function isApprovedPublic(space) {
  return Boolean(space) && space.approved_public === true;
}

export function publicSpaces(spaces) {
  return (spaces || []).filter(isApprovedPublic);
}

export function cleanText(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function formatDuration(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const total = Math.max(0, Math.round(value));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  return cleanText(value, 40);
}

export function normalizeModels(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return list.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 20);
}

/**
 * Ingest always starts private. Client-supplied status and approved_public are ignored.
 */
export function normalizeIngestMeta(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "meta.json must be a JSON object" };
  }
  const title = cleanText(input.title, 300);
  const date = cleanText(input.date, 40);
  const duration = formatDuration(input.duration);
  if (!title || !date || !duration) {
    return { error: "meta.json requires title, date, and duration" };
  }
  let requestedId = "";
  if (input.id != null && String(input.id).trim() !== "") {
    requestedId = String(input.id).trim().toLowerCase();
  }
  return {
    requestedId,
    meta: {
      title,
      date,
      duration,
      models: normalizeModels(input.models),
      status: "private",
      approved_public: false,
    },
  };
}

export function sortSpaces(spaces) {
  return [...(spaces || [])].sort((a, b) => {
    const byDate = String(b.date || "").localeCompare(String(a.date || ""));
    if (byDate) return byDate;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}
