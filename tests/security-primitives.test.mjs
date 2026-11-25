import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { clientIpFromForwardedFor, constantTimeHexEqual, httpStatusForError, progressiveAccountDelayMs, rateLimitHash, isRateLimitLocked, isFixedWindowExpired, successfulLoginResetTargets } from "../src/lib/security-primitives.mjs";

test("activation secret comparison accepts only the matching SHA-256 digest", () => {
  const secret = "a-long-one-time-activation-secret";
  const digest = createHash("sha256").update(secret, "utf8").digest("hex");
  assert.equal(constantTimeHexEqual(digest, secret), true);
  assert.equal(constantTimeHexEqual(digest, "different"), false);
  assert.equal(constantTimeHexEqual("not-a-digest", secret), false);
  assert.equal(constantTimeHexEqual(digest, null), false);
});
test("proxy hop count selects the Nth X-Forwarded-For entry from the right", () => {
  assert.equal(clientIpFromForwardedFor("198.51.100.10, 10.0.0.2, 10.0.0.3", "2"), "10.0.0.2");
  assert.equal(clientIpFromForwardedFor("198.51.100.10, 10.0.0.2", "1"), "10.0.0.2");
  assert.equal(clientIpFromForwardedFor("198.51.100.10, 10.0.0.2", "2"), "198.51.100.10");
});
test("spoofed forwarding headers are ignored unless trusted hops are explicitly configured", () => {
  const spoofed = "203.0.113.99, 198.51.100.20";
  assert.equal(clientIpFromForwardedFor(spoofed, undefined), null);
  assert.equal(clientIpFromForwardedFor(spoofed, ""), null);
  assert.equal(clientIpFromForwardedFor(spoofed, "0"), null);
  assert.equal(clientIpFromForwardedFor(spoofed, "invalid"), null);
  assert.equal(clientIpFromForwardedFor(spoofed, "3"), null);
  assert.equal(clientIpFromForwardedFor("not-an-ip", "1"), null);
});
test("a failed-IP counter is keyed independently from another IP's victim pair", () => {
  const secret = "s".repeat(32);
  const victimAtOne = rateLimitHash("login-email-ip:victim@example.com:192.0.2.1", secret);
  const victimAtTwo = rateLimitHash("login-email-ip:victim@example.com:192.0.2.2", secret);
  assert.notEqual(victimAtOne, victimAtTwo);
  const ipWideOne = rateLimitHash("login-ip:192.0.2.1", secret);
  const ipWideTwo = rateLimitHash("login-ip:192.0.2.2", secret);
  assert.notEqual(ipWideOne, ipWideTwo);
  assert.equal(ipWideOne, rateLimitHash("login-ip:192.0.2.1", secret));
  assert.equal(isRateLimitLocked(new Date(5000), 4000), true);
  assert.equal(isRateLimitLocked(new Date(5000), 5000), false);
  assert.equal(isRateLimitLocked(new Date(5000), 6000), false);
});
test("successful login reset key is scoped to email plus IP", () => {
  const secret = "s".repeat(32);
  const pair = rateLimitHash("login-email-ip:a@example.com:192.0.2.1", secret);
  const ipWide = rateLimitHash("login-ip:192.0.2.1", secret);
  const account = rateLimitHash("account:a@example.com", secret);
  assert.notEqual(pair, ipWide);
  assert.notEqual(pair, account);
  assert.deepEqual(successfulLoginResetTargets({ keyType: "login_email_ip", keyHash: pair }), [{ keyType: "login_email_ip", keyHash: pair }]);
  assert.deepEqual(successfulLoginResetTargets(null), []);
});
test("account soft delay grows, is not a hard lock, and trusted IP bypasses it", () => {
  assert.equal(progressiveAccountDelayMs(99, false), 0);
  assert.equal(progressiveAccountDelayMs(100, false), 250);
  assert.equal(progressiveAccountDelayMs(110, false), 500);
  assert.equal(progressiveAccountDelayMs(1000, false), 30_000);
  assert.equal(progressiveAccountDelayMs(1000, true), 0);
});
test("fixed-window expiration is based on the start time, not sliding activity", () => {
  const windowStart = 1_000_000;
  const windowMs = 15 * 60 * 1000;
  assert.equal(isFixedWindowExpired(windowStart, windowStart + windowMs - 1, windowMs), false);
  assert.equal(isFixedWindowExpired(windowStart, windowStart + windowMs, windowMs), true);
});
test("database and validation errors map to stable HTTP statuses", () => {
  assert.equal(httpStatusForError({ cause: { code: "23505" } }), 409);
  assert.equal(httpStatusForError(new Error("Forbidden: administrator access required.")), 403);
  assert.equal(httpStatusForError(new Error("Quantity must be positive.")), 400);
  assert.equal(httpStatusForError(new Error("Unexpected"), 503), 503);
});
