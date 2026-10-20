const DOT_SEGMENT = /^\./;

/**
 * Block /.git and any other dotfile or dot-directory, including encoded forms.
 * Also rejects traversal segments.
 */
export function isBlockedDotPath(pathname) {
  const raw = String(pathname || "");
  if (raw.includes("\\") || raw.includes("\0") || raw.includes("%00") || raw.includes("%0")) {
    if (/%00/i.test(raw) || raw.includes("\0") || raw.includes("\\")) return true;
  }
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return true;
  }
  if (/%2e/i.test(decoded) || decoded.includes("%")) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return true;
    }
  }
  const parts = decoded.split("/");
  for (const part of parts) {
    if (!part) continue;
    if (part === "." || part === ".." || DOT_SEGMENT.test(part)) return true;
  }
  return false;
}

export function blockedDotResponse(pathname) {
  if (!isBlockedDotPath(pathname)) return null;
  return new Response("Not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function isPrivateArchivePath(pathname) {
  const path = String(pathname || "");
  return (
    path === "/archive" ||
    path.startsWith("/archive/") ||
    path === "/api/archive" ||
    path.startsWith("/api/archive/")
  );
}

const SAFE_ID = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

export function isSafeId(id) {
  return typeof id === "string" && SAFE_ID.test(id);
}

export function decodeId(raw) {
  if (raw == null || raw === "") return "";
  let value = String(raw);
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (value.includes("/") || value.includes("\\") || value.includes("..") || value.startsWith(".")) {
    return null;
  }
  return value;
}

/**
 * Accept both the public URL and the rewritten function URL.
 */
export function resolveRoute(url) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const route = url.searchParams.get("route");

  if (route === "ingest" || path === "/api/archive/ingest") {
    return { kind: "ingest" };
  }
  if (route === "audio") {
    return {
      kind: "audio",
      audience: url.searchParams.get("audience") === "owner" ? "owner" : "public",
      id: url.searchParams.get("id") || "",
    };
  }
  if (route === "page") {
    const section = url.searchParams.get("section") === "archive" ? "archive" : "spaces";
    return { kind: "page", section, id: url.searchParams.get("id") || "" };
  }

  let match = path.match(/^\/api\/archive\/audio\/([^/]+)$/);
  if (match) return { kind: "audio", audience: "owner", id: decodeURIComponent(match[1]) };
  match = path.match(/^\/api\/spaces\/audio\/([^/]+)$/);
  if (match) return { kind: "audio", audience: "public", id: decodeURIComponent(match[1]) };
  if (path === "/archive") return { kind: "page", section: "archive", id: "" };
  match = path.match(/^\/archive\/([^/]+)$/);
  if (match) return { kind: "page", section: "archive", id: decodeURIComponent(match[1]) };
  if (path === "/spaces") return { kind: "page", section: "spaces", id: "" };
  match = path.match(/^\/spaces\/([^/]+)$/);
  if (match) return { kind: "page", section: "spaces", id: decodeURIComponent(match[1]) };

  // The function's own URL. POST is ingest (including the Blob upload callback).
  // GET is not a directory listing.
  if (path === "/api/archive") {
    return { kind: "ingest-base" };
  }
  return null;
}

const AUDIO_EXT = "mp3|m4a|mp4|wav|webm|ogg|aac";

export function parseAudioTarget(pathname) {
  const match = String(pathname || "").match(
    new RegExp(`^spaces/(${SAFE_ID.source.slice(1, -1)})/audio\\.(${AUDIO_EXT})$`),
  );
  if (!match) return null;
  return { id: match[1], ext: match[2] };
}

export function audioContentType(ext) {
  switch (String(ext || "").toLowerCase()) {
    case "mp3":
      return "audio/mpeg";
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "wav":
      return "audio/wav";
    case "webm":
      return "audio/webm";
    case "ogg":
      return "audio/ogg";
    case "aac":
      return "audio/aac";
    default:
      return "application/octet-stream";
  }
}

export function extensionForType(contentType, filename) {
  const fromName = String(filename || "").toLowerCase().match(/\.([a-z0-9]{2,4})$/);
  if (fromName && /^(mp3|m4a|mp4|wav|webm|ogg|aac)$/.test(fromName[1])) return fromName[1];
  const type = String(contentType || "").toLowerCase();
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("wav")) return "wav";
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("aac")) return "aac";
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";
  return "";
}
