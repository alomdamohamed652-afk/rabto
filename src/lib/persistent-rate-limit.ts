import { and, eq, or, sql } from "drizzle-orm";
import type { getDb } from "@/db";
import { loginAttempts, trustedLoginIps } from "@/db/schema";
type Database = ReturnType<typeof getDb>;
export type RateLimitKey = { keyType: string; keyHash: string };

export async function readRateLimitRows(db: Database, keys: RateLimitKey[]) {
  if (!keys.length) return [];
  return db.select().from(loginAttempts).where(or(...keys.map((key) => and(
    eq(loginAttempts.keyType, key.keyType), eq(loginAttempts.keyHash, key.keyHash),
  ))));
}
export function activeLock(rows: Array<{ lockedUntil: Date | null }>, now = Date.now()) {
  const until = rows.reduce((max, row) => Math.max(max, row.lockedUntil?.getTime() ?? 0), 0);
  return until > now ? { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((until - now) / 1000)) } : { allowed: true, retryAfterSeconds: 0 };
}
export async function recordRateLimitFailure(db: Database, key: RateLimitKey, limit: number, windowSeconds: number) {
  const expired = sql`${loginAttempts.windowStart} <= now() - make_interval(secs => ${windowSeconds})`;
  const [row] = await db.insert(loginAttempts).values({
    keyType: key.keyType, keyHash: key.keyHash, failedCount: 1, windowStart: new Date(), lockedUntil: null,
  }).onConflictDoUpdate({
    target: [loginAttempts.keyType, loginAttempts.keyHash],
    set: {
      failedCount: sql`CASE WHEN ${expired} THEN 1 ELSE ${loginAttempts.failedCount} + 1 END`,
      windowStart: sql`CASE WHEN ${expired} THEN now() ELSE ${loginAttempts.windowStart} END`,
      lockedUntil: sql`CASE WHEN ${expired} THEN NULL WHEN ${loginAttempts.failedCount} + 1 >= ${limit} THEN ${loginAttempts.windowStart} + make_interval(secs => ${windowSeconds}) ELSE ${loginAttempts.lockedUntil} END`,
      updatedAt: sql`now()`,
    },
  }).returning();
  return row;
}
export async function clearRateLimitKey(db: Database, key: RateLimitKey) {
  await db.delete(loginAttempts).where(and(eq(loginAttempts.keyType, key.keyType), eq(loginAttempts.keyHash, key.keyHash)));
}
export async function isTrustedLoginIp(db: Database, accountHash: string, ipHash: string) {
  const [row] = await db.select({ id: trustedLoginIps.id }).from(trustedLoginIps).where(and(
    eq(trustedLoginIps.accountHash, accountHash), eq(trustedLoginIps.ipHash, ipHash),
    sql`${trustedLoginIps.lastSuccessAt} >= now() - interval '30 days'`,
  )).limit(1);
  return Boolean(row);
}
export async function rememberSuccessfulLoginIp(db: Database, accountHash: string, ipHash: string) {
  await db.insert(trustedLoginIps).values({ accountHash, ipHash, lastSuccessAt: new Date() })
    .onConflictDoUpdate({ target: [trustedLoginIps.accountHash, trustedLoginIps.ipHash], set: { lastSuccessAt: sql`now()` } });
}
