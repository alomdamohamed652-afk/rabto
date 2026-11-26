const TYPES = new Set(["credit", "adjustment"]);
const KEY = /^[A-Za-z0-9._:-]{8,120}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate an admin credit request. Debits and resets are not exposed: no arbitrary deductions. */
export function validateCreditEntry(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const { accountId, entryType, amount, reason, idempotencyKey } = body;
  if (typeof accountId !== "string" || !UUID.test(accountId)) return { ok: false, error: "accountId must be a UUID." };
  if (typeof entryType !== "string" || !TYPES.has(entryType)) return { ok: false, error: "entryType must be credit or adjustment." };
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) return { ok: false, error: "amount must be a non-zero integer." };
  if (entryType === "credit" && amount < 0) return { ok: false, error: "credit amount must be positive." };
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.length > 500) return { ok: false, error: "reason is required." };
  if (typeof idempotencyKey !== "string" || !KEY.test(idempotencyKey)) return { ok: false, error: "idempotencyKey must be 8-120 safe characters." };
  return { ok: true, value: { accountId, entryType, amount, reason: reason.trim(), idempotencyKey } };
}
