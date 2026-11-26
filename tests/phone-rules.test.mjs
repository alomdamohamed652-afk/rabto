import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, parseLoginIdentifier } from "../src/lib/phone-rules.mjs";

test("phone formats converge to one E.164 value", () => {
  for (const v of ["01012345678", "+201012345678", "00201012345678", "+20 101 234 5678", "(010) 1234-5678", "٠١٠١٢٣٤٥٦٧٨"]) assert.equal(normalizePhone(v), "+201012345678", v);
  assert.equal(normalizePhone("+1 415 555 0100"), "+14155550100");
});
test("ambiguous or malformed numbers are rejected", () => {
  for (const v of ["", "12345", "0101234", "4155550100", "+0123456789", "+1234", "abc", "+2010123456789012345", 5, null]) assert.equal(normalizePhone(v), null, String(v));
});
test("identifier kind", () => {
  assert.deepEqual(parseLoginIdentifier(" A@B.co "), { kind: "email", value: "a@b.co" });
  assert.deepEqual(parseLoginIdentifier("01012345678"), { kind: "phone", value: "+201012345678" });
  assert.equal(parseLoginIdentifier("a@b").kind, "invalid");
  assert.equal(parseLoginIdentifier("nope").kind, "invalid");
});
