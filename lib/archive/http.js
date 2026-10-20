export function baseHeaders(init = {}) {
  const headers = new Headers(init);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");
  return headers;
}

export function textResponse(status, body, { robots = "noindex, nofollow", cache = "no-store", cookies = [], extra = {} } = {}) {
  const headers = baseHeaders({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Robots-Tag": robots,
    "Cache-Control": cache,
    ...extra,
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(body, { status, headers });
}

export function htmlResponse(status, body, { robots = "noindex, nofollow", cache = "private, no-store", cookies = [], extra = {} } = {}) {
  const headers = baseHeaders({
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": robots,
    "Cache-Control": cache,
    ...extra,
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(body, { status, headers });
}

export function jsonResponse(status, obj, extra = {}) {
  const headers = baseHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "no-store",
    ...extra,
  });
  return new Response(JSON.stringify(obj), { status, headers });
}

export function redirectResponse(location, cookies = []) {
  const headers = baseHeaders({
    Location: location,
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "no-store",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}
