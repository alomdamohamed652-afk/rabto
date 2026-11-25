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
