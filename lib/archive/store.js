import { isSafeId } from "./paths.js";

const INDEX_PATH = "spaces/index.json";
const RATE_PATH = "security/login-rate.json";

async function streamToBuffer(stream) {
  if (!stream) return Buffer.alloc(0);
  if (typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function isPrecondition(error) {
  return Boolean(error && (error.code === "PRECONDITION" || error.name === "BlobPreconditionFailedError"));
}

export function createArchiveStore(blob) {
  async function readJson(pathname) {
    const result = await blob.get(pathname);
    if (!result || result.statusCode === 404 || result.stream == null) return null;
    const text = (await streamToBuffer(result.stream)).toString("utf8");
    if (!text) return { data: null, etag: result.blob?.etag || null };
    return { data: JSON.parse(text), etag: result.blob?.etag || null };
  }

  async function writeJson(pathname, data, etag) {
    await blob.put(pathname, JSON.stringify(data), {
      contentType: "application/json",
      ifMatch: etag || undefined,
    });
  }

  async function mutateJson(pathname, fallback, mutator) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await readJson(pathname);
      const data = structuredClone(current?.data || fallback());
      const keep = await mutator(data);
      if (keep === false) return data;
      try {
        await writeJson(pathname, data, current?.etag || null);
        return data;
      } catch (error) {
        if (!isPrecondition(error) || attempt === 4) throw error;
      }
    }
    return fallback();
  }

  return {
    async list() {
      const current = await readJson(INDEX_PATH);
      return current?.data?.spaces || [];
    },

    async get(id) {
      if (!isSafeId(id)) return null;
      const spaces = await this.list();
      return spaces.find((space) => space.id === id) || null;
    },

    async upsertSpace(record, files) {
      const id = record.id;
      const index = await mutateJson(INDEX_PATH, () => ({ version: 1, spaces: [] }), async (draft) => {
        draft.version = 1;
        draft.spaces = draft.spaces || [];
        const existing = draft.spaces.find((space) => space.id === id);
        const now = record.updated_at;
        const next = {
          id,
          title: record.title,
          date: record.date,
          duration: record.duration,
          models: record.models,
          status: "private",
          approved_public: false,
          speaker_names: existing?.speaker_names || {},
          audio: record.audio || existing?.audio || null,
          files: {
            transcript_txt: files.transcriptTxt != null || Boolean(existing?.files?.transcript_txt),
            transcript_srt: files.transcriptSrt != null || Boolean(existing?.files?.transcript_srt),
            full_json: files.fullJson != null || Boolean(existing?.files?.full_json),
          },
          created_at: existing?.created_at || now,
          updated_at: now,
        };
        draft.spaces = draft.spaces.filter((space) => space.id !== id).concat(next);
      });
      const saved = (index.spaces || []).find((space) => space.id === id);
      const writes = [
        blob.put(`spaces/${id}/meta.json`, JSON.stringify(metaFor(saved), null, 2), {
          contentType: "application/json",
        }),
      ];
      if (files.transcriptTxt != null) {
        writes.push(blob.put(`spaces/${id}/transcript.txt`, files.transcriptTxt, { contentType: "text/plain; charset=utf-8" }));
      }
      if (files.transcriptSrt != null) {
        writes.push(blob.put(`spaces/${id}/transcript.srt`, files.transcriptSrt, { contentType: "application/x-subrip; charset=utf-8" }));
      }
      if (files.fullJson != null) {
        writes.push(blob.put(`spaces/${id}/full.json`, files.fullJson, { contentType: "application/json" }));
      }
      if (files.audio) {
        writes.push(blob.put(files.audio.pathname, files.audio.body, { contentType: files.audio.contentType }));
      }
      await Promise.all(writes);
      return saved;
    },

    async update(id, mutator) {
      if (!isSafeId(id)) return null;
      let found = false;
      await mutateJson(INDEX_PATH, () => ({ version: 1, spaces: [] }), async (index) => {
        const space = (index.spaces || []).find((item) => item.id === id);
        if (!space) return false;
        await mutator(space);
        found = true;
        return true;
      });
      if (!found) return null;
      const fresh = await this.get(id);
      if (fresh) {
        await blob.put(
          `spaces/${id}/meta.json`,
          JSON.stringify(
            {
              title: fresh.title,
              date: fresh.date,
              duration: fresh.duration,
              models: fresh.models,
              status: fresh.status,
              approved_public: fresh.approved_public,
              speaker_names: fresh.speaker_names || {},
            },
            null,
            2,
          ),
          { contentType: "application/json" },
        );
      }
      return fresh;
    },

    async readText(id, name) {
      if (!isSafeId(id)) return "";
      const result = await blob.get(`spaces/${id}/${name}`);
      if (!result || !result.stream) return "";
      return (await streamToBuffer(result.stream)).toString("utf8");
    },

    async openAudio(space, rangeHeader) {
      if (!space?.audio?.pathname) return null;
      const headers = rangeHeader ? { range: rangeHeader } : undefined;
      return blob.get(space.audio.pathname, { headers });
    },

    async rateState() {
      const current = await readJson(RATE_PATH);
      return current?.data?.keys || {};
    },

    async mutateRate(mutator) {
      return mutateJson(RATE_PATH, () => ({ keys: {} }), async (data) => {
        data.keys = data.keys || {};
        await mutator(data.keys);
      });
    },
  };
}

function metaFor(record) {
  return {
    title: record.title,
    date: record.date,
    duration: record.duration,
    models: record.models,
    status: record.status || "private",
    approved_public: record.approved_public === true,
    speaker_names: record.speaker_names || {},
  };
}

export function createMemoryBlob() {
  const files = new Map();
  return {
    async put(pathname, body, options = {}) {
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
      const current = files.get(pathname);
      if (options.ifMatch) {
        if (!current || current.etag !== options.ifMatch) {
          const error = new Error("precondition");
          error.code = "PRECONDITION";
          throw error;
        }
      }
      const etag = `${buf.length.toString(16)}-${Math.random().toString(16).slice(2)}`;
      files.set(pathname, {
        body: buf,
        contentType: options.contentType || "application/octet-stream",
        etag,
      });
      return { pathname, etag, contentType: options.contentType || "application/octet-stream" };
    },
    async get(pathname, options = {}) {
      const file = files.get(pathname);
      if (!file) return null;
      let buf = file.body;
      let statusCode = 200;
      const headers = new Headers();
      headers.set("content-type", file.contentType);
      headers.set("etag", file.etag);
      const range = options.headers?.range || options.headers?.Range;
      if (range) {
        const match = String(range).match(/bytes=(\d+)-(\d*)/);
        if (!match) return null;
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : file.body.length - 1;
        if (start >= file.body.length || end < start) {
          headers.set("content-range", `bytes */${file.body.length}`);
          return { statusCode: 416, stream: null, headers, blob: { size: file.body.length, contentType: file.contentType, etag: file.etag, pathname } };
        }
        buf = file.body.subarray(start, end + 1);
        statusCode = 206;
        headers.set("content-range", `bytes ${start}-${end}/${file.body.length}`);
      }
      headers.set("content-length", String(buf.length));
      return {
        statusCode,
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(buf);
            controller.close();
          },
        }),
        headers,
        blob: {
          pathname,
          contentType: file.contentType,
          size: statusCode === 206 ? buf.length : file.body.length,
          etag: file.etag,
        },
      };
    },
  };
}
