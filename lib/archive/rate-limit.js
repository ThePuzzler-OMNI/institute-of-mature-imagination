import crypto from "node:crypto";

export const LOGIN_RATE = {
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
};

export function rateKey(ip) {
  return crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 32);
}

export function activeFailures(timestamps, now) {
  return (timestamps || []).filter((stamp) => now - stamp < LOGIN_RATE.windowMs);
}

export function rateDecision(timestamps, now) {
  const failures = activeFailures(timestamps, now);
  if (failures.length >= LOGIN_RATE.maxFailures) {
    const oldest = failures[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + LOGIN_RATE.windowMs - now) / 1000));
    return { limited: true, failures, retryAfter };
  }
  return { limited: false, failures, retryAfter: 0 };
}

export function pushFailure(failures, now) {
  return activeFailures(failures.concat(now), now);
}
