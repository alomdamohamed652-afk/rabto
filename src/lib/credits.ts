import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { creditAccounts, creditLedger } from "@/db/schema";
import { validateCreditEntry, type CreditEntryInput } from "@/lib/credit-rules.mjs";

export type PostCreditResult =
  | { kind: "posted" | "replayed"; entryId: string; balanceAfter: number }
  | { kind: "account-not-found" }
  | { kind: "insufficient" }
  | { kind: "key-conflict" };

/**
 * The only write path to credit balances. One transaction: lock the account,
 * check the rule, append a ledger row, update the balance. A repeated
 * idempotency key with the same payload returns the original entry.
 */
export async function postCreditEntry(input: CreditEntryInput & { accountId: string; actorUserId: string }): Promise<PostCreditResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('rabto.ledger_tx', 'on', true)`);
    const [account] = await tx.select().from(creditAccounts).where(eq(creditAccounts.id, input.accountId)).for("update").limit(1);
    if (!account) return { kind: "account-not-found" as const };

    const [existing] = await tx.select().from(creditLedger).where(and(
      eq(creditLedger.accountId, input.accountId),
      eq(creditLedger.idempotencyKey, input.idempotencyKey),
    )).limit(1);
    if (existing) {
      const same = existing.entryType === input.entryType && existing.amount === input.amount && existing.reason === input.reason;
      return same
        ? { kind: "replayed" as const, entryId: existing.id, balanceAfter: existing.balanceAfter }
        : { kind: "key-conflict" as const };
    }

    const next = account.balance + input.amount;
    if (next < 0) return { kind: "insufficient" as const };
    const [entry] = await tx.insert(creditLedger).values({
      accountId: input.accountId,
      entryType: input.entryType,
      amount: input.amount,
      balanceAfter: next,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
    }).returning({ id: creditLedger.id });
    await tx.update(creditAccounts).set({ balance: next, updatedAt: new Date() }).where(eq(creditAccounts.id, input.accountId));
    return { kind: "posted" as const, entryId: entry.id, balanceAfter: next };
  });
}

export function validateInput(body: unknown) {
  return validateCreditEntry(body);
}
