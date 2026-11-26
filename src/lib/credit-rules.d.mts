export type CreditEntryInput = { entryType: "credit" | "adjustment"; amount: number; reason: string; idempotencyKey: string };
export function validateCreditEntry(body: unknown):
  | { ok: true; value: CreditEntryInput & { accountId: string } }
  | { ok: false; error: string };
