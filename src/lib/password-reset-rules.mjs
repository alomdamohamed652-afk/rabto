import { createHmac, randomInt } from "node:crypto";
// Email OTP password reset rules (design from the user's Tezkar decision: 6-digit hashed code,
// 10 minute expiry, 5 attempts, uniform responses). Pure helpers, no I/O.
export const RESET_POLICY = { codeDigits: 6, ttlSeconds: 600, maxAttempts: 5, requestsPerHour: 5 };
export function generateCode() { return String(randomInt(0, 10 ** RESET_POLICY.codeDigits)).padStart(RESET_POLICY.codeDigits, "0"); }
export function hashCode(userId, code, secret = process.env.SESSION_SECRET) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("SESSION_SECRET must be configured.");
  return createHmac("sha256", secret).update("pwreset:" + userId + ":" + code, "utf8").digest("hex");
}
export function validateResetRequest(body) {
  if (!body || typeof body.email !== "string") return { ok: false };
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return { ok: false };
  return { ok: true, email };
}
export function validateResetConfirm(body) {
  const r = validateResetRequest(body);
  if (!r.ok) return { ok: false };
  if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) return { ok: false };
  if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) return { ok: false, passwordRule: true };
  return { ok: true, email: r.email, code: body.code, password: body.password };
}
export function codeUsable(row, now = Date.now()) {
  return !!row && !row.usedAt && new Date(row.expiresAt).getTime() > now && row.attempts < RESET_POLICY.maxAttempts;
}
import { timingSafeEqual } from "node:crypto";
/** Constant-time compare of two hex digests of equal length. */
export function digestsEqual(aHex, bHex) {
  if (typeof aHex !== "string" || typeof bHex !== "string" || aHex.length !== bHex.length) return false;
  return timingSafeEqual(Buffer.from(aHex, "hex"), Buffer.from(bHex, "hex"));
}

/** "ahmed@gmail.com" -> "a***@g***.com". Never reveals the length of either part. */
export function maskEmail(email) {
  const [local, domain = ""] = String(email).split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 1)}***@${host.slice(0, 1)}***${tld}`;
}

/**
 * Same shape as maskEmail for a phone that has no account, derived from a keyed hash so the answer
 * is stable per phone and an unknown phone looks like a known one (no account enumeration by phone).
 */
export function decoyMaskedEmail(digestHex) {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const pick = (i) => letters[parseInt(digestHex.slice(i * 2, i * 2 + 2), 16) % letters.length];
  const tlds = [".com", ".com", ".com", ".net", ".org"];
  return `${pick(0)}***@${pick(1)}***${tlds[parseInt(digestHex.slice(4, 6), 16) % tlds.length]}`;
}
