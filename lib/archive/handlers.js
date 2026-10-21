import crypto from "node:crypto";
import {
  SESSION_COOKIE,
  bearerToken,
  clearSessionCookie,
  clientIp,
  isHttps,
  newSession,
  safeEqualString,
  sessionCookie,
  sessionFromRequest,
} from "./auth.js";
import { htmlResponse, jsonResponse, redirectResponse, textResponse } from "./http.js";
import {
  configPage,
  loginPage,
  missingPage,
  ownerDetailPage,
  ownerListPage,
  publicDetailPage,
  publicListPage,
} from "./html.js";
import { audioContentType, extensionForType, isSafeId, parseAudioTarget, resolveRoute } from "./paths.js";
import { isApprovedPublic, normalizeIngestMeta, publicSpaces, sortSpaces } from "./policy.js";
import { LOGIN_RATE, pushFailure, rateDecision, rateKey } from "./rate-limit.js";
import { chooseBlocks } from "./transcript.js";

const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/webm",
  "audio/ogg",
  "audio/aac",
  "audio/x-aac",
  "video/mp4",
];

const TEXT_LIMIT = 1_500_000;
const AUDIO_LIMIT = 4_000_000;

function envOf(deps) {
  return deps.env || process.env;
}

function nowOf(deps) {
  return deps.now ? deps.now() : Date.now();
}

function storeOf(deps) {
  if (!deps.store) throw Object.assign(new Error("missing store"), { code: "NO_STORE" });
  return deps.store;
}

function configured(env, key) {
  return Boolean(env[key] && String(env[key]).trim());
}

async function readForm(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json") || type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    if (type.includes("application/json")) {
      return { kind: "json", body: await request.json() };
    }
    const form = await request.formData();
    return { kind: "form", form };
  }
  return { kind: "empty" };
}

function fieldText(form, name) {
  const value = form.get(name);
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value;
}

async function asText(part) {
  if (part == null) return null;
  if (typeof part === "string") return part;
  return part.text();
}

function slugId(title, date) {
  const base = `${date}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = crypto.randomBytes(3).toString("hex");
  const id = `${base || "space"}-${suffix}`.replace(/-+/g, "-");
  return isSafeId(id) ? id : `space-${suffix}`;
}

async function loadBlocks(store, space) {
  const txt = space.files?.transcript_txt ? await store.readText(space.id, "transcript.txt") : "";
  const fullText = space.files?.full_json ? await store.readText(space.id, "full.json") : "";
  const srt = space.files?.transcript_srt ? await store.readText(space.id, "transcript.srt") : "";
  return chooseBlocks({ txt, fullText, srt });
}

function safeEqualForm(a, b) {
  return safeEqualString(a || "", b || "");
}

async function loginAttempt(request, deps, password) {
  const env = envOf(deps);
  const now = nowOf(deps);
  const secure = isHttps(request);
  if (!configured(env, "ARCHIVE_OWNER_SECRET")) {
    return htmlResponse(503, configPage("Set ARCHIVE_OWNER_SECRET before signing in."));
  }
  if (!configured(env, "BLOB_READ_WRITE_TOKEN")) {
    return htmlResponse(503, configPage("Set BLOB_READ_WRITE_TOKEN before signing in."));
  }
  const store = storeOf(deps);
  const key = rateKey(clientIp(request));
  const state = await store.rateState();
  const decision = rateDecision(state[key], now);
  if (decision.limited) {
    return htmlResponse(429, loginPage({ retryAfter: decision.retryAfter }), {
      extra: { "Retry-After": String(decision.retryAfter) },
    });
  }
  const accepted = safeEqualString(env.ARCHIVE_OWNER_SECRET, password || "");
  if (!accepted) {
    await store.mutateRate((keys) => {
      keys[key] = pushFailure(rateDecision(keys[key], now).failures, now);
    });
    return htmlResponse(401, loginPage({ error: "That password was not accepted." }));
  }
  await store.mutateRate((keys) => {
    delete keys[key];
  });
  const session = newSession(env.ARCHIVE_OWNER_SECRET, now);
  return redirectResponse("/archive", [sessionCookie(session.token, { secure })]);
}

function requireOwner(request, deps) {
  const env = envOf(deps);
  if (!configured(env, "ARCHIVE_OWNER_SECRET") || !configured(env, "BLOB_READ_WRITE_TOKEN")) {
    return { error: htmlResponse(503, configPage("Set ARCHIVE_OWNER_SECRET and BLOB_READ_WRITE_TOKEN.")) };
  }
  const session = sessionFromRequest(request, env.ARCHIVE_OWNER_SECRET, nowOf(deps));
  if (!session) return { session: null };
  return { session };
}

async function handleOwnerPost(request, deps, id, session) {
  const parsed = await readForm(request);
  if (parsed.kind !== "form") return textResponse(400, "Expected a form post");
  const action = String(parsed.form.get("action") || "");
  const csrf = String(parsed.form.get("password") ? "" : parsed.form.get("csrf") || "");
  if (action === "" && parsed.form.get("password")) {
    return loginAttempt(request, deps, String(parsed.form.get("password") || ""));
  }
  if (!safeEqualForm(csrf, session.csrf)) return textResponse(403, "Forbidden");
  const secure = isHttps(request);
  if (action === "logout") {
    return redirectResponse("/archive", [clearSessionCookie(secure)]);
  }
  if (!isSafeId(id)) return htmlResponse(404, missingPage());
  const store = storeOf(deps);
  const space = await store.get(id);
  if (!space) return htmlResponse(404, missingPage());
  if (action === "approve") {
    await store.update(id, (row) => {
      row.status = "public";
      row.approved_public = true;
      row.updated_at = new Date(nowOf(deps)).toISOString();
    });
  } else if (action === "make_private") {
    await store.update(id, (row) => {
      row.status = "private";
      row.approved_public = false;
      row.updated_at = new Date(nowOf(deps)).toISOString();
    });
  } else if (action === "rename") {
    const names = {};
    for (const [key, value] of parsed.form.entries()) {
      const match = key.match(/^speaker_(\d+)$/);
      if (!match) continue;
      const label = `Speaker ${Number(match[1])}`;
      const cleaned = String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, 80);
      if (cleaned) names[label] = cleaned;
    }
    await store.update(id, (row) => {
      row.speaker_names = names;
      row.updated_at = new Date(nowOf(deps)).toISOString();
    });
  } else {
    return textResponse(400, "Unknown action");
  }
  return redirectResponse(`/archive/${id}`);
}

async function archivePage(request, deps, id) {
  const gate = requireOwner(request, deps);
  if (gate.error) return gate.error;
  if (!gate.session) {
    if (request.method === "POST") {
      const parsed = await readForm(request);
      const password = parsed.kind === "form" ? String(parsed.form.get("password") || "") : "";
      return loginAttempt(request, deps, password);
    }
    if (request.method !== "GET" && request.method !== "HEAD") return textResponse(405, "Method not allowed");
    return htmlResponse(200, loginPage());
  }
  if (request.method === "POST") return handleOwnerPost(request, deps, id, gate.session);
  if (request.method !== "GET" && request.method !== "HEAD") return textResponse(405, "Method not allowed");
  const store = storeOf(deps);
  if (!id) {
    const spaces = sortSpaces(await store.list());
    return htmlResponse(200, ownerListPage({ spaces, csrf: gate.session.csrf }));
  }
  if (!isSafeId(id)) return htmlResponse(404, missingPage());
  const space = await store.get(id);
  if (!space) return htmlResponse(404, missingPage());
  const blocks = await loadBlocks(store, space);
  return htmlResponse(200, ownerDetailPage({ space, blocks, csrf: gate.session.csrf }));
}

async function spacesPage(request, deps, id) {
  if (request.method !== "GET" && request.method !== "HEAD") return textResponse(405, "Method not allowed");
  const env = envOf(deps);
  if (!configured(env, "BLOB_READ_WRITE_TOKEN")) {
    return textResponse(503, "The public archive is temporarily unavailable.");
  }
  const store = storeOf(deps);
  if (!id) {
    const spaces = sortSpaces(publicSpaces(await store.list()));
    return htmlResponse(200, publicListPage({ spaces }), {
      robots: "index, follow",
      cache: "private, no-store",
    });
  }
  if (!isSafeId(id)) return htmlResponse(404, missingPage({ publicChrome: true }));
  const space = await store.get(id);
  if (!isApprovedPublic(space)) return htmlResponse(404, missingPage({ publicChrome: true }));
  const blocks = await loadBlocks(store, space);
  return htmlResponse(200, publicDetailPage({ space, blocks }), {
    robots: "index, follow",
    cache: "private, no-store",
  });
}

async function audioResponse(request, deps, audience, id) {
  if (request.method !== "GET" && request.method !== "HEAD") return textResponse(405, "Method not allowed");
  const env = envOf(deps);
  if (!configured(env, "BLOB_READ_WRITE_TOKEN")) return textResponse(404, "Not found");
  if (!isSafeId(id)) return textResponse(404, "Not found");
  const store = storeOf(deps);
  const space = await store.get(id);
  if (!space || !space.audio) return textResponse(404, "Not found");
  if (audience === "public") {
    if (!isApprovedPublic(space)) return textResponse(404, "Not found");
  } else {
    const gate = requireOwner(request, deps);
    if (gate.error || !gate.session) return textResponse(404, "Not found");
  }
  let result;
  try {
    result = await store.openAudio(space, request.headers.get("range"));
  } catch (error) {
    if (/416/.test(String(error && error.message))) return textResponse(416, "Range not satisfiable");
    throw error;
  }
  if (!result || result.statusCode === 404 || result.stream == null) {
    if (result?.statusCode === 416) return textResponse(416, "Range not satisfiable");
    return textResponse(404, "Not found");
  }
  const status = result.statusCode === 206 || result.headers?.get?.("content-range") ? 206 : 200;
  const headers = new Headers();
  headers.set("Content-Type", space.audio.contentType || result.blob?.contentType || "application/octet-stream");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Disposition", `inline; filename="${(space.audio.filename || "audio").replace(/[^a-zA-Z0-9._-]/g, "") || "audio"}"`);
  const length = result.headers?.get?.("content-length");
  if (length) headers.set("Content-Length", length);
  const contentRange = result.headers?.get?.("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);
  if (request.method === "HEAD") return new Response(null, { status, headers });
  return new Response(result.stream, { status, headers });
}

async function partBytes(part) {
  if (!part || typeof part === "string") return Buffer.from(part || "");
  return Buffer.from(await part.arrayBuffer());
}

async function ingestMultipart(form, deps) {
  const metaPart = fieldText(form, "meta.json");
  if (!metaPart) return jsonResponse(400, { error: "meta.json is required" });
  let parsed;
  try {
    parsed = JSON.parse(await asText(metaPart));
  } catch {
    return jsonResponse(400, { error: "meta.json must be JSON" });
  }
  const normalized = normalizeIngestMeta(parsed);
  if (normalized.error) return jsonResponse(400, { error: normalized.error });

  const transcriptPart = fieldText(form, "transcript.txt");
  const srtPart = fieldText(form, "transcript.srt");
  const fullPart = fieldText(form, "full.json");
  const audioPart = fieldText(form, "audio");
  const transcriptTxt = transcriptPart ? await asText(transcriptPart) : null;
  const transcriptSrt = srtPart ? await asText(srtPart) : null;
  const fullJson = fullPart ? await asText(fullPart) : null;
  if (transcriptTxt && transcriptTxt.length > TEXT_LIMIT) return jsonResponse(413, { error: "transcript.txt is too large" });
  if (transcriptSrt && transcriptSrt.length > TEXT_LIMIT) return jsonResponse(413, { error: "transcript.srt is too large" });
  if (fullJson && fullJson.length > TEXT_LIMIT) return jsonResponse(413, { error: "full.json is too large" });
  if (fullJson) {
    try {
      JSON.parse(fullJson);
    } catch {
      return jsonResponse(400, { error: "full.json must be JSON" });
    }
  }

  let audio = null;
  if (audioPart && typeof audioPart !== "string") {
    if (audioPart.size > AUDIO_LIMIT) {
      return jsonResponse(413, {
        error: "Audio is larger than the function request limit. Ingest the text files first, then upload audio with scripts/ingest-space.mjs.",
      });
    }
    const ext = extensionForType(audioPart.type, audioPart.name);
    if (!ext) return jsonResponse(400, { error: "audio must be mp3, m4a, mp4, wav, webm, ogg, or aac" });
    const body = await partBytes(audioPart);
    audio = { ext, contentType: audioPart.type || audioContentType(ext), body, filename: audioPart.name || `audio.${ext}` };
  }

  const store = storeOf(deps);
  let id = normalized.requestedId;
  if (id) {
    if (!isSafeId(id)) return jsonResponse(400, { error: "meta.json id must be a lowercase slug" });
  } else {
    id = slugId(normalized.meta.title, normalized.meta.date);
  }
  const saved = await store.upsertSpace(
    {
      id,
      ...normalized.meta,
      updated_at: new Date(nowOf(deps)).toISOString(),
      audio: audio
        ? {
            pathname: `spaces/${id}/audio.${audio.ext}`,
            contentType: audio.contentType,
            filename: `audio.${audio.ext}`,
          }
        : null,
    },
    {
      transcriptTxt,
      transcriptSrt,
      fullJson,
      audio: audio
        ? { pathname: `spaces/${id}/audio.${audio.ext}`, contentType: audio.contentType, body: audio.body }
        : null,
    },
  );
  return jsonResponse(201, {
    ok: true,
    id: saved.id,
    title: saved.title,
    date: saved.date,
    duration: saved.duration,
    models: saved.models,
    status: saved.status,
    approved_public: saved.approved_public,
  });
}

function callbackUrl(request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  const proto = (request.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  if (!host) return undefined;
  return `${proto}://${host}/api/archive/ingest`;
}

async function ingestClientUpload(request, body, deps) {
  const env = envOf(deps);
  if (body?.type === "blob.generate-client-token") {
    if (!safeEqualString(env.INGEST_TOKEN, bearerToken(request))) {
      return jsonResponse(401, { error: "Unauthorized" });
    }
  } else if (body?.type !== "blob.upload-completed") {
    return jsonResponse(400, { error: "Unsupported JSON body" });
  }
  const { handleUpload } = await import("@vercel/blob/client");
  const store = storeOf(deps);
  try {
    const result = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const target = parseAudioTarget(pathname);
        const payloadId = String(clientPayload || "").trim();
        if (!target || payloadId !== target.id) {
          throw new Error("Audio pathname is not allowed");
        }
        const space = await store.get(target.id);
        if (!space) throw new Error("Unknown space");
        return {
          addRandomSuffix: false,
          allowOverwrite: true,
          allowedContentTypes: AUDIO_TYPES,
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
          tokenPayload: JSON.stringify({ id: target.id }),
          callbackUrl: callbackUrl(request),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let payload = {};
        try {
          payload = JSON.parse(tokenPayload || "{}");
        } catch {
          return;
        }
        const target = parseAudioTarget(blob?.pathname);
        if (!target || target.id !== payload.id) return;
        await store.update(target.id, (row) => {
          row.audio = {
            pathname: blob.pathname,
            contentType: blob.contentType || audioContentType(target.ext),
            filename: `audio.${target.ext}`,
          };
          row.updated_at = new Date(nowOf(deps)).toISOString();
        });
      },
    });
    return jsonResponse(200, result);
  } catch (error) {
    console.error("archive ingest upload rejected", error && error.name ? error.name : "error");
    return jsonResponse(400, { error: "Upload was rejected" });
  }
}

async function ingest(request, deps) {
  if (request.method !== "POST") return textResponse(404, "Not found");
  const env = envOf(deps);
  if (!configured(env, "INGEST_TOKEN") || !configured(env, "BLOB_READ_WRITE_TOKEN")) {
    return jsonResponse(503, { error: "Set INGEST_TOKEN and BLOB_READ_WRITE_TOKEN" });
  }
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON" });
    }
    return ingestClientUpload(request, body, deps);
  }
  if (!safeEqualString(env.INGEST_TOKEN, bearerToken(request))) {
    return jsonResponse(401, { error: "Unauthorized" });
  }
  if (!type.includes("multipart/form-data")) {
    return jsonResponse(415, { error: "Send multipart/form-data or a Blob client upload" });
  }
  const form = await request.formData();
  return ingestMultipart(form, deps);
}

export async function dispatch(request, deps) {
  const url = new URL(request.url);
  const route = resolveRoute(url);
  if (!route) return textResponse(404, "Not found");
  if (route.kind === "ingest-base") {
    if (request.method === "POST") return ingest(request, deps);
    return textResponse(404, "Not found");
  }
  if (route.kind === "ingest") return ingest(request, deps);
  if (route.kind === "audio") return audioResponse(request, deps, route.audience, route.id || "");
  if (route.kind === "page" && route.section === "archive") return archivePage(request, deps, route.id || "");
  if (route.kind === "page" && route.section === "spaces") return spacesPage(request, deps, route.id || "");
  return textResponse(404, "Not found");
}

export { LOGIN_RATE, SESSION_COOKIE };
