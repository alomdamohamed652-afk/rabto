import test from "node:test";
import assert from "node:assert/strict";
import { validateTicket, validateReply, statusAfterMessage, validateStatus } from "../src/lib/support-rules.mjs";
test("ticket validation trims and bounds", () => {
  assert.deepEqual(validateTicket({ subject: "  Tag   broken ", body: " hi " }), { ok: true, subject: "Tag broken", body: "hi" });
  assert.equal(validateTicket({ subject: "ab", body: "x" }).ok, false);
  assert.equal(validateTicket({ subject: "Fine subject", body: "" }).ok, false);
  assert.equal(validateTicket({ subject: "Fine subject", body: "x".repeat(4001) }).ok, false);
  assert.equal(validateReply({ body: "   " }).ok, false);
  assert.equal(validateTicket(null).ok, false);
});
test("status flow", () => {
  assert.equal(statusAfterMessage(true), "pending");
  assert.equal(statusAfterMessage(false), "open");
  assert.equal(validateStatus("closed"), "closed");
  assert.equal(validateStatus("x"), null);
});
