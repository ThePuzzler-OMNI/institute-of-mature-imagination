import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { createArchiveStore } from "./store.js";

function readToken() {
  const value = process.env.BLOB_READ_WRITE_TOKEN;
  if (!value || !String(value).trim()) {
    const error = new Error("BLOB_NOT_CONFIGURED");
    error.code = "BLOB_NOT_CONFIGURED";
    throw error;
  }
  return value;
}

export function createVercelBlobAdapter() {
  return {
    async put(pathname, body, options = {}) {
      try {
        return await put(pathname, body, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: options.contentType,
          cacheControlMaxAge: 60,
          token: readToken(),
          ifMatch: options.ifMatch,
        });
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError || error?.name === "BlobPreconditionFailedError") {
          const wrapped = new Error("precondition");
          wrapped.code = "PRECONDITION";
          throw wrapped;
        }
        throw error;
      }
    },
    async get(pathname, options = {}) {
      return get(pathname, {
        access: "private",
        useCache: false,
        token: readToken(),
        headers: options.headers,
      });
    },
  };
}

export function productionDeps() {
  return {
    store: createArchiveStore(createVercelBlobAdapter()),
    env: process.env,
  };
}
