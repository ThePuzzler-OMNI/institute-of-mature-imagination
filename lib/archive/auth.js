import crypto from "node:crypto";

export const SESSION_COOKIE = "imi_archive_session";
export const SESSION_MS = 12 * 60 * 60 * 1000;

export function safeEqualString(a, b) {
  const left = crypto.createHash("sha256").update(String(a), "utf8").digest();
  const right = crypto.createHash("sha256").update(String(b), "utf8").digest();
  return crypto.timingSafeEqual(left, right);
}

export function signSession(secret, payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(secret, token, now = Date.now()) {
  if (!secret || !token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || payload.sub !== "owner" || typeof payload.exp !== "number") return null;
    if (payload.exp <= now) return null;
    if (typeof payload.csrf !== "string" || payload.csrf.length < 16) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newSession(secret, now = Date.now()) {
  const csrf = crypto.randomBytes(18).toString("base64url");
  const payload = { sub: "owner", exp: now + SESSION_MS, csrf };
  return { payload, token: signSession(secret, payload) };
}

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const pieces = header.split(";");
  for (const piece of pieces) {
    const trimmed = piece.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (key === name) return trimmed.slice(eq + 1);
  }
  return "";
}

export function sessionFromRequest(request, secret, now) {
  return verifySession(secret, readCookie(request, SESSION_COOKIE), now);
}

export function isHttps(request) {
  const forwarded = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
  if (forwarded) return forwarded === "https";
  return new URL(request.url).protocol === "https:";
}

export function sessionCookie(token, { secure, maxAge = SESSION_MS / 1000 } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure) {
  return sessionCookie("", { secure, maxAge: 0 });
}

export function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function clientIp(request) {
  const real = (request.headers.get("x-real-ip") || "").trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return "unknown";
}
