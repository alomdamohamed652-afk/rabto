import test from "node:test";
import assert from "node:assert/strict";
import { RESET_POLICY, generateCode, hashCode, validateResetRequest, validateResetConfirm, codeUsable } from "../src/lib/password-reset-rules.mjs";
const S = "x".repeat(40);
test("codes are 6 digits and hashing is user and secret bound", () => {
  for (let i = 0; i < 50; i++) assert.match(generateCode(), /^\d{6}$/);
  assert.equal(hashCode("u1", "123456", S).length, 64);
  assert.notEqual(hashCode("u1", "123456", S), hashCode("u2", "123456", S));
  assert.notEqual(hashCode("u1", "123456", S), hashCode("u1", "123457", S));
  assert.throws(() => hashCode("u1", "123456", "short"));
});
test("request and confirm validation", () => {
  assert.equal(validateResetRequest({ email: "a@b.co" }).email, "a@b.co");
  assert.equal(validateResetRequest({ email: "nope" }).ok, false);
  assert.equal(validateResetConfirm({ email: "a@b.co", code: "12345", password: "a".repeat(12) }).ok, false);
  assert.equal(validateResetConfirm({ email: "a@b.co", code: "123456", password: "short" }).passwordRule, true);
  assert.equal(validateResetConfirm({ email: " A@B.co ", code: "123456", password: "a".repeat(12) }).email, "a@b.co");
});
test("code usable only when fresh, unused and under attempt cap", () => {
  const now = Date.now(); const ok = { usedAt: null, expiresAt: new Date(now + 1000), attempts: 0 };
  assert.equal(codeUsable(ok, now), true);
  assert.equal(codeUsable({ ...ok, usedAt: new Date() }, now), false);
  assert.equal(codeUsable({ ...ok, expiresAt: new Date(now - 1) }, now), false);
  assert.equal(codeUsable({ ...ok, attempts: RESET_POLICY.maxAttempts }, now), false);
  assert.equal(codeUsable(null, now), false);
});
import { digestsEqual } from "../src/lib/password-reset-rules.mjs";
test("digest compare accepts equal hashes only", () => {
  const h = hashCode("u1", "123456", S);
  assert.equal(digestsEqual(h, h), true);
  assert.equal(digestsEqual(h, hashCode("u1", "123457", S)), false);
  assert.equal(digestsEqual(h, "abc"), false);
});

import { maskEmail, decoyMaskedEmail } from "../src/lib/password-reset-rules.mjs";
test("masking hides lengths and decoy has the same shape", () => {
  assert.equal(maskEmail("ahmed@gmail.com"), "a***@g***.com");
  assert.equal(maskEmail("x@y.co.uk"), "x***@y***.uk".replace(".uk", ".uk"));
  assert.match(decoyMaskedEmail("0a1b2c3d4e5f"), /^[a-z]\*\*\*@[a-z]\*\*\*\.[a-z]+$/);
  assert.equal(decoyMaskedEmail("0a1b2c3d4e5f"), decoyMaskedEmail("0a1b2c3d4e5f"));
});
