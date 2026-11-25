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
