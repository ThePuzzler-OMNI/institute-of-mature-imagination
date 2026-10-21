import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { signSession, verifySession } from "../lib/archive/auth.js";
import { dispatch } from "../lib/archive/handlers.js";
import { blockedDotResponse, isBlockedDotPath, parseAudioTarget } from "../lib/archive/paths.js";
import { isApprovedPublic, normalizeIngestMeta, publicSpaces } from "../lib/archive/policy.js";
import { rateDecision } from "../lib/archive/rate-limit.js";
import { createArchiveStore, createMemoryBlob } from "../lib/archive/store.js";
import { chooseBlocks, parseFullJson, parseSrt, parseTranscriptText } from "../lib/archive/transcript.js";

const ENV = {
  ARCHIVE_OWNER_SECRET: "owner-secret-test",
  INGEST_TOKEN: "ingest-token-test",
  BLOB_READ_WRITE_TOKEN: "memory-token",
};

function app() {
  const blob = createMemoryBlob();
  const store = createArchiveStore(blob);
  return { blob, deps: { store, env: { ...ENV }, now: () => Date.now() } };
}

function startServer(deps) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const blocked = blockedDotResponse(url.pathname);
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (blocked) {
        await writeResponse(res, blocked);
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (["host", "connection", "content-length", "transfer-encoding"].includes(key)) continue;
        if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
        else if (value != null) headers.set(key, value);
      }
      const request = new Request(url, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
      });
      await writeResponse(res, await dispatch(request, deps));
    } catch (error) {
      res.statusCode = 500;
      res.end(error && error.stack ? error.stack : String(error));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function writeResponse(res, response) {
  res.statusCode = response.status;
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  response.headers.forEach((value, key) => {
    if (key === "set-cookie") return;
    res.setHeader(key, value);
  });
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function cookieFrom(response) {
  const raw = response.headers.get("set-cookie") || "";
  const pair = raw.split(";")[0];
  return pair.includes("=") ? pair : "";
}

async function ingest(base, meta, extras = {}) {
  const form = new FormData();
  form.set("meta.json", new Blob([JSON.stringify(meta)], { type: "application/json" }), "meta.json");
  form.set(
    "transcript.txt",
    new Blob([extras.transcript || "Speaker 1: Hello from the record\nSpeaker 2: Good to be here\n"], { type: "text/plain" }),
    "transcript.txt",
  );
  form.set(
    "transcript.srt",
    new Blob(["1\n00:00:00,000 --> 00:00:01,000\nSpeaker 1: Hello from the record\n"], { type: "application/x-subrip" }),
    "transcript.srt",
  );
  form.set(
    "full.json",
    new Blob([JSON.stringify({ segments: [{ speaker: "Speaker 1", text: "Hello from the record" }] })], { type: "application/json" }),
    "full.json",
  );
  form.set("audio", new Blob([extras.audio || "ID3-fake-audio"], { type: "audio/mpeg" }), "space.mp3");
  return fetch(`${base}/api/archive/ingest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ENV.INGEST_TOKEN}` },
    body: form,
  });
}

async function login(base, password = ENV.ARCHIVE_OWNER_SECRET) {
  return fetch(`${base}/archive`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "owner", password }),
  });
}

test("ingest meta is forced private and keeps the documented fields", () => {
  const normalized = normalizeIngestMeta({
    title: "Evening room",
    date: "2026-08-02",
    duration: 3723,
    models: ["whisper", "diarize"],
    status: "public",
    approved_public: true,
  });
  assert.equal(normalized.error, undefined);
  assert.deepEqual(normalized.meta, {
    title: "Evening room",
    date: "2026-08-02",
    duration: "1:02:03",
    models: ["whisper", "diarize"],
    status: "private",
    approved_public: false,
  });
  assert.equal(isApprovedPublic({ approved_public: true, status: "private" }), true);
  assert.equal(isApprovedPublic({ approved_public: "true", status: "public" }), false);
  assert.equal(isApprovedPublic({ approved_public: false, status: "public" }), false);
  assert.deepEqual(
    publicSpaces([
      { id: "a", approved_public: false, status: "public" },
      { id: "b", approved_public: true, status: "private" },
    ]).map((space) => space.id),
    ["b"],
  );
});

test("transcript keeps Speaker N labels and falls back through full.json and srt", () => {
  assert.deepEqual(parseTranscriptText("Speaker 1: Hello\nmore\nSpeaker 2: There"), [
    { speaker: "Speaker 1", text: "Hello\nmore" },
    { speaker: "Speaker 2", text: "There" },
  ]);
  assert.deepEqual(parseFullJson({ segments: [{ speaker: "SPEAKER_02", text: "From json" }] }), [
    { speaker: "Speaker 2", text: "From json" },
  ]);
  assert.deepEqual(parseSrt("1\n00:00:00,000 --> 00:00:01,000\nSpeaker 3: From srt\n"), [
    { speaker: "Speaker 3", text: "From srt" },
  ]);
  assert.equal(chooseBlocks({ txt: "no labels", fullText: JSON.stringify({ utterances: [{ speaker: "spk 4", transcript: "Json line" }] }) })[0].speaker, "Speaker 4");
});

test("session cookie is signed and dot paths are blocked", () => {
  const token = signSession("secret", { sub: "owner", exp: Date.now() + 1000, csrf: "csrf-token-value-ok" });
  assert.equal(verifySession("secret", token)?.sub, "owner");
  assert.equal(verifySession("other", token), null);
  assert.equal(verifySession("secret", token.slice(0, -2) + "aa"), null);
  assert.equal(verifySession("secret", signSession("secret", { sub: "owner", exp: Date.now() - 10, csrf: "csrf-token-value-ok" })), null);
  assert.equal(rateDecision([Date.now(), Date.now(), Date.now(), Date.now(), Date.now()], Date.now()).limited, true);
  for (const path of ["/.git", "/.git/HEAD", "/.env", "/foo/.secret", "/%2eenv", "/%2e%2e/%2egit"]) {
    assert.equal(isBlockedDotPath(path), true, path);
    assert.equal(blockedDotResponse(path).status, 404);
  }
  assert.equal(isBlockedDotPath("/spaces"), false);
  assert.equal(isBlockedDotPath("/archive"), false);
  assert.deepEqual(parseAudioTarget("spaces/evening-room/audio.mp3"), { id: "evening-room", ext: "mp3" });
  assert.equal(parseAudioTarget("spaces/../audio.mp3"), null);
  assert.equal(parseAudioTarget("other/evening/audio.mp3"), null);
});

test("archive flow hides unapproved Spaces on the server", async () => {
  const { blob, deps } = app();
  const server = await startServer(deps);
  try {
    const created = await ingest(server.base, {
      title: "Secret <script>room</script>",
      date: "2026-08-02",
      duration: "45:00",
      models: ["whisper"],
      status: "public",
      approved_public: true,
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201);
    assert.equal(createdBody.status, "private");
    assert.equal(createdBody.approved_public, false);
    assert.equal(createdBody.models[0], "whisper");
    const id = createdBody.id;

    const hidden = await fetch(`${server.base}/spaces/${id}`);
    const hiddenHtml = await hidden.text();
    assert.equal(hidden.status, 404);
    assert.equal(hiddenHtml.includes("Secret"), false);
    assert.equal(hiddenHtml.includes("Hello from the record"), false);
    assert.match(hidden.headers.get("x-robots-tag"), /noindex/);

    const hiddenAudio = await fetch(`${server.base}/api/spaces/audio/${id}`);
    assert.equal(hiddenAudio.status, 404);
    assert.equal(await hiddenAudio.text(), "Not found");

    const list = await fetch(`${server.base}/spaces`);
    const listHtml = await list.text();
    assert.equal(list.status, 200);
    assert.equal(listHtml.includes("Secret"), false);
    assert.match(list.headers.get("x-robots-tag"), /index/);

    const anon = await fetch(`${server.base}/archive`);
    const anonHtml = await anon.text();
    assert.equal(anonHtml.includes("Secret"), false);
    assert.match(anon.headers.get("x-robots-tag"), /noindex/);
    assert.match(anonHtml, /Sign in/);

    const signedIn = await login(server.base);
    const cookie = cookieFrom(signedIn);
    assert.equal(signedIn.status, 303);
    assert.match(signedIn.headers.get("set-cookie"), /HttpOnly/);
    assert.equal(signedIn.headers.get("set-cookie").includes(ENV.ARCHIVE_OWNER_SECRET), false);

    const owner = await fetch(`${server.base}/archive`, { headers: { cookie } });
    const ownerHtml = await owner.text();
    assert.match(ownerHtml, /Secret &lt;script&gt;room&lt;\/script&gt;/);
    assert.match(ownerHtml, /private/);
    const detail = await fetch(`${server.base}/archive/${id}`, { headers: { cookie } });
    const detailHtml = await detail.text();
    assert.match(detailHtml, /Approve public/);
    assert.match(detailHtml, /Make private/);
    assert.match(detailHtml, /Rename speakers/);
    assert.match(detailHtml, /Speaker 1/);
    assert.match(detailHtml, /Hello from the record/);
    const csrf = detailHtml.match(/name="csrf" value="([^"]+)"/)[1];

    const audioDenied = await fetch(`${server.base}/api/archive/audio/${id}`);
    assert.equal(audioDenied.status, 404);
    const audio = await fetch(`${server.base}/api/archive/audio/${id}`, { headers: { cookie, Range: "bytes=0-3" } });
    assert.equal(audio.status, 206);
    assert.equal(await audio.text(), "ID3-");

    const publicWithCookie = await fetch(`${server.base}/spaces/${id}`, { headers: { cookie } });
    assert.equal(publicWithCookie.status, 404);

    const renamed = await fetch(`${server.base}/archive/${id}`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "rename", csrf, speaker_1: "Tim", speaker_2: "" }),
    });
    assert.equal(renamed.status, 303);
    const named = await fetch(`${server.base}/archive/${id}`, { headers: { cookie } });
    assert.match(await named.text(), /Tim/);

    const badCsrf = await fetch(`${server.base}/archive/${id}`, {
      method: "POST",
      headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "approve", csrf: "not-the-token" }),
    });
    assert.equal(badCsrf.status, 403);

    const approved = await fetch(`${server.base}/archive/${id}`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "approve", csrf }),
    });
    assert.equal(approved.status, 303);
    const live = await fetch(`${server.base}/spaces/${id}`);
    const liveHtml = await live.text();
    assert.equal(live.status, 200);
    assert.match(liveHtml, /Hello from the record/);
    assert.match(liveHtml, /Speaker 1/);
    assert.match(liveHtml, /Tim/);
    assert.equal(liveHtml.includes("Approve public"), false);
    const liveAudio = await fetch(`${server.base}/api/spaces/audio/${id}`);
    assert.equal(liveAudio.status, 200);
    assert.match(liveAudio.headers.get("content-type"), /audio\/mpeg/);
    assert.equal(await liveAudio.text(), "ID3-fake-audio");
    const listed = await fetch(`${server.base}/spaces`);
    assert.match(await listed.text(), /Secret &lt;script&gt;room/);

    const again = await ingest(server.base, {
      id,
      title: "Secret <script>room</script>",
      date: "2026-08-02",
      duration: "45:00",
      models: ["whisper"],
      approved_public: true,
      status: "public",
    });
    assert.equal((await again.json()).approved_public, false);
    assert.equal((await fetch(`${server.base}/spaces/${id}`)).status, 404);

    await fetch(`${server.base}/archive/${id}`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "approve", csrf }),
    });
    assert.equal((await fetch(`${server.base}/spaces/${id}`)).status, 200);
    await fetch(`${server.base}/archive/${id}`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "make_private", csrf }),
    });
    assert.equal((await fetch(`${server.base}/spaces/${id}`)).status, 404);
    assert.equal((await fetch(`${server.base}/api/spaces/audio/${id}`)).status, 404);

    await blob.put(
      "spaces/index.json",
      JSON.stringify({
        version: 1,
        spaces: [
          {
            id: "mixed-status",
            title: "Mixed status title",
            date: "2026-01-01",
            duration: "1:00",
            models: [],
            status: "public",
            approved_public: false,
            speaker_names: {},
            audio: null,
            files: {},
          },
          {
            id: "bool-wins",
            title: "Boolean wins",
            date: "2026-01-02",
            duration: "2:00",
            models: [],
            status: "private",
            approved_public: true,
            speaker_names: {},
            audio: null,
            files: {},
          },
        ],
      }),
      { contentType: "application/json" },
    );
    const mixed = await fetch(`${server.base}/spaces/mixed-status`);
    assert.equal(mixed.status, 404);
    assert.equal((await mixed.text()).includes("Mixed status title"), false);
    const boolPage = await fetch(`${server.base}/spaces`);
    const boolHtml = await boolPage.text();
    assert.match(boolHtml, /Boolean wins/);
    assert.equal(boolHtml.includes("Mixed status title"), false);

    const listing = await fetch(`${server.base}/api/archive`);
    assert.equal(listing.status, 404);
    assert.equal(await listing.text(), "Not found");
    const git = await fetch(`${server.base}/.git/HEAD`);
    assert.equal(git.status, 404);
    const unauthorized = await fetch(`${server.base}/api/archive/ingest`, {
      method: "POST",
      headers: { Authorization: "Bearer wrong", "Content-Type": "application/json" },
      body: JSON.stringify({ type: "blob.generate-client-token" }),
    });
    assert.equal(unauthorized.status, 401);
  } finally {
    await server.close();
  }
});

test("login rate limit blocks further attempts", async () => {
  const { deps } = app();
  const server = await startServer(deps);
  try {
    for (let i = 0; i < 5; i++) {
      const response = await login(server.base, "nope");
      assert.equal(response.status, 401);
    }
    const blocked = await login(server.base, ENV.ARCHIVE_OWNER_SECRET);
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    assert.match(await blocked.text(), /Too many attempts/);
  } finally {
    await server.close();
  }
});
