import { createHash, randomBytes } from "node:crypto";

/** Creates an opaque public resolver code. The DB unique constraint is the final collision guard. */
export function generatePublicCode(): string {
  return randomBytes(9).toString("base64url");
}

/** Create a one-time activation secret; persist only its hash. */
export function generateActivationSecret(): string {
  return randomBytes(24).toString("base64url");
}

export function hashActivationSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
