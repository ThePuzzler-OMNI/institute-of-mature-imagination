#!/usr/bin/env node
/**
 * Send one Space directory to /api/archive/ingest.
 *
 *   INGEST_TOKEN=... node scripts/ingest-space.mjs https://preview-host.vercel.app ./space-dir
 *
 * The directory may contain meta.json, transcript.txt, transcript.srt, full.json,
 * and one audio file (mp3, m4a, mp4, wav, webm, ogg, aac). Nothing here is committed.
 * Audio over about 3.5MB is uploaded straight to private Blob after the text files,
 * because Vercel functions reject request bodies over 4.5MB.
 */
import fs from "node:fs";
import path from "node:path";

const AUDIO_EXT = new Set(["mp3", "m4a", "mp4", "wav", "webm", "ogg", "aac"]);
const TEXT_BUDGET = 3_500_000;

const [base, dir] = process.argv.slice(2);
const token = process.env.INGEST_TOKEN || "";
if (!base || !dir || !token) {
  console.error("Usage: INGEST_TOKEN=... node scripts/ingest-space.mjs <base-url> <directory>");
  process.exit(1);
}

const root = path.resolve(dir);
const names = fs.readdirSync(root);
function file(name) {
  return names.includes(name) ? path.join(root, name) : null;
}

const audioName = names.find((name) => AUDIO_EXT.has(path.extname(name).slice(1).toLowerCase()));
const audioPath = audioName ? path.join(root, audioName) : null;
const audioSize = audioPath ? fs.statSync(audioPath).size : 0;
const sendAudioInline = Boolean(audioPath) && audioSize <= TEXT_BUDGET;

const form = new FormData();
for (const name of ["meta.json", "transcript.txt", "transcript.srt", "full.json"]) {
  const found = file(name);
  if (!found) continue;
  const bytes = fs.readFileSync(found);
  form.append(name, new Blob([bytes]), name);
}
if (sendAudioInline) {
  form.append("audio", new Blob([fs.readFileSync(audioPath)]), audioName);
}

const response = await fetch(new URL("/api/archive/ingest", base), {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const payload = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(payload.error || response.statusText);
  process.exit(1);
}
console.log(JSON.stringify({ id: payload.id, status: payload.status, approved_public: payload.approved_public }));

if (audioPath && !sendAudioInline) {
  const { openAsBlob } = await import("node:fs");
  const { upload } = await import("@vercel/blob/client");
  const ext = path.extname(audioPath).slice(1).toLowerCase();
  const blob = await openAsBlob(audioPath);
  await upload(`spaces/${payload.id}/audio.${ext}`, blob, {
    access: "private",
    multipart: true,
    handleUploadUrl: new URL("/api/archive/ingest", base).href,
    headers: { Authorization: `Bearer ${token}` },
    clientPayload: payload.id,
    contentType: blob.type || "application/octet-stream",
  });
  console.log(`audio uploaded to spaces/${payload.id}/audio.${ext}`);
}
