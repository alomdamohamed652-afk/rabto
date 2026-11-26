import test from "node:test";
import assert from "node:assert/strict";
import { validateCreditEntry } from "../src/lib/credit-rules.mjs";

const base = { accountId: "123e4567-e89b-42d3-a456-426614174000", entryType: "credit", amount: 5, reason: "welcome grant", idempotencyKey: "grant-0001-abcd" };

test("accepts a valid credit and trims reason", () => {
  const r = validateCreditEntry({ ...base, reason: "  welcome grant  " });
  assert.equal(r.ok, true);
  assert.equal(r.value.reason, "welcome grant");
});
test("rejects debit and reset entry types (no arbitrary deductions)", () => {
  for (const entryType of ["debit", "reset", "other"]) assert.equal(validateCreditEntry({ ...base, entryType }).ok, false);
});
test("rejects zero, fractional, huge and negative credit amounts", () => {
  for (const amount of [0, 1.5, 2_000_000, -3, "5", NaN]) assert.equal(validateCreditEntry({ ...base, amount }).ok, false);
});
test("adjustment may be negative", () => {
  assert.equal(validateCreditEntry({ ...base, entryType: "adjustment", amount: -2 }).ok, true);
});
test("requires reason, uuid account and a safe idempotency key", () => {
  assert.equal(validateCreditEntry({ ...base, reason: " " }).ok, false);
  assert.equal(validateCreditEntry({ ...base, accountId: "x" }).ok, false);
  assert.equal(validateCreditEntry({ ...base, idempotencyKey: "short" }).ok, false);
  assert.equal(validateCreditEntry({ ...base, idempotencyKey: "has space in it" }).ok, false);
  assert.equal(validateCreditEntry(null).ok, false);
});
