import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  checkRateLimit,
  clearRateLimit,
  constantTimeHexEqual,
  httpStatusForError,
  recordRateLimitFailure,
} from "../src/lib/security-primitives.mjs";

test("activation secret comparison accepts only the matching SHA-256 digest", () => {
  const secret = "a-long-one-time-activation-secret";
  const digest = createHash("sha256").update(secret, "utf8").digest("hex");

  assert.equal(constantTimeHexEqual(digest, secret), true);
  assert.equal(constantTimeHexEqual(digest, "a-different-secret-value"), false);
  assert.equal(constantTimeHexEqual("not-a-sha256-digest", secret), false);
  assert.equal(constantTimeHexEqual(digest, null), false);
});

test("rate limit permits ten failures and blocks the next attempt for the remaining window", () => {
  const key = "test:login:ten-attempts";
  const start = 1_000_000;
  clearRateLimit(key);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal(checkRateLimit(key, start + attempt).allowed, true);
    recordRateLimitFailure(key, start + attempt);
  }

  const blocked = checkRateLimit(key, start + 10);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 900);

  clearRateLimit(key);
});

test("rate limit expires after fifteen minutes and starts a fresh window", () => {
  const key = "test:activation:window-expiry";
  const start = 2_000_000;
  clearRateLimit(key);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    recordRateLimitFailure(key, start + attempt);
  }

  assert.equal(checkRateLimit(key, start + 14 * 60 * 1000).allowed, false);
  assert.equal(checkRateLimit(key, start + 15 * 60 * 1000).allowed, true);

  clearRateLimit(key);
});

test("successful authentication can clear a rate-limit bucket", () => {
  const key = "test:login:clear";
  for (let attempt = 0; attempt < 10; attempt += 1) {
    recordRateLimitFailure(key, 3_000_000 + attempt);
  }

  clearRateLimit(key);
  assert.equal(checkRateLimit(key, 3_000_010).allowed, true);
});

test("database unique violations map to HTTP 409", () => {
  assert.equal(httpStatusForError({ code: "23505" }), 409);
});

test("authorization errors map to HTTP 403", () => {
  assert.equal(httpStatusForError(new Error("Forbidden: platform administrator access required.")), 403);
});

test("validation errors map to HTTP 400 and unknown errors keep the fallback", () => {
  assert.equal(httpStatusForError(new Error("Quantity must be positive.")), 400);
  assert.equal(httpStatusForError(new Error("Database unavailable.")), 500);
  assert.equal(httpStatusForError(new Error("Unexpected"), 503), 503);
});
