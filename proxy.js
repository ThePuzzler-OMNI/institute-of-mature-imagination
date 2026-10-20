import { next } from "@vercel/functions";
import { blockedDotResponse, isPrivateArchivePath } from "./lib/archive/paths.js";

/**
 * Runs before static files. Dot paths (including /.git) never fall through
 * to the filesystem, and the private archive is marked noindex.
 */
export default function proxy(request) {
  const url = new URL(request.url);
  const blocked = blockedDotResponse(url.pathname);
  if (blocked) return blocked;
  if (isPrivateArchivePath(url.pathname)) {
    return next({
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  return next();
}
