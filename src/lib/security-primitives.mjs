import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export function constantTimeHexEqual(expectedHex, suppliedValue) {
  if (typeof expectedHex !== "string" || typeof suppliedValue !== "string") return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = createHash("sha256").update(suppliedValue, "utf8").digest();
  if (expected.length !== actual.length) { timingSafeEqual(Buffer.alloc(32), actual); return false; }
  return timingSafeEqual(expected, actual);
}
export function httpStatusForError(error, fallback = 500) {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && current.code === "23505") return 409;
    current = "cause" in current ? current.cause : null;
  }
  const message = error instanceof Error ? error.message : "";
  if (/forbidden|administrator access|required platform administrator/i.test(message)) return 403;
  if (/required|must be|not found|not belong|already exists|already in use|must contain/i.test(message)) return 400;
  return fallback;
}
export function clientIpFromForwardedFor(header, trustedProxyHops) {
  const raw = typeof trustedProxyHops === "string" ? trustedProxyHops.trim() : "";
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const hops = Number(raw);
  if (!Number.isSafeInteger(hops) || hops > 20 || typeof header !== "string") return null;
  const entries = header.split(",").map((entry) => entry.trim());
  if (entries.length < hops) return null;
  let candidate = entries[entries.length - hops];
  if (candidate.startsWith("[") && candidate.endsWith("]")) candidate = candidate.slice(1, -1);
  return isIP(candidate) ? candidate.toLowerCase() : null;
}
export function rateLimitHash(value, secret = process.env.SESSION_SECRET) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("SESSION_SECRET must be configured before rate limiting can run.");
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}
export function progressiveAccountDelayMs(failedCount, trustedIp = false) {
  if (trustedIp || failedCount < 100) return 0;
  const level = Math.min(7, Math.floor((failedCount - 100) / 10));
  return Math.min(30_000, 250 * (2 ** level));
}
export function isRateLimitLocked(lockedUntil, now = Date.now()) {
  return lockedUntil instanceof Date && lockedUntil.getTime() > now;
}
export function isFixedWindowExpired(windowStart, now, windowMs) {
  return now >= windowStart + windowMs;
}
export function successfulLoginResetTargets(emailIpKey) {
  return emailIpKey ? [emailIpKey] : [];
}
export function unknownIpLoginKey(email, hash) {
  return { keyType: "login_email_unknown_ip", keyHash: hash("login-email-unknown:" + email) };
}
