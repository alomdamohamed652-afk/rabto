import { createHash, timingSafeEqual } from "node:crypto";

export function constantTimeHexEqual(expectedHex, suppliedValue) {
  if (typeof expectedHex !== "string" || typeof suppliedValue !== "string") return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = createHash("sha256").update(suppliedValue, "utf8").digest();
  if (expected.length !== actual.length) {
    timingSafeEqual(Buffer.alloc(32), actual);
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export function httpStatusForError(error, fallback = 500) {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") return 409;
  const message = error instanceof Error ? error.message : "";
  if (/forbidden|administrator access|required platform administrator/i.test(message)) return 403;
  if (/required|must be|not found|not belong|already exists|already in use|must contain/i.test(message)) return 400;
  return fallback;
}

const FAILURE_LIMIT = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const rateLimitBuckets = new Map();

function currentBucket(key, now) {
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.delete(key);
    return null;
  }
  return bucket;
}

export function checkRateLimit(key, now = Date.now()) {
  const bucket = currentBucket(key, now);
  if (!bucket || bucket.count < FAILURE_LIMIT) {
    return { allowed: true, retryAfterSeconds: 0, remaining: FAILURE_LIMIT - (bucket?.count ?? 0) };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    remaining: 0,
  };
}

export function recordRateLimitFailure(key, now = Date.now()) {
  const bucket = currentBucket(key, now);
  const next = bucket
    ? { count: bucket.count + 1, resetAt: bucket.resetAt }
    : { count: 1, resetAt: now + FAILURE_WINDOW_MS };
  rateLimitBuckets.set(key, next);
  return checkRateLimit(key, now);
}

export function clearRateLimit(key) {
  rateLimitBuckets.delete(key);
}
