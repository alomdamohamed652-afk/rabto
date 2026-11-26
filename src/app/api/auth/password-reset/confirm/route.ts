import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, passwordResetCodes, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { activeLock, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { codeUsable, digestsEqual, hashCode, validateResetConfirm } from "@/lib/password-reset-rules.mjs";
import { clientIpFromForwardedFor, rateLimitHash } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";
const BAD = { error: "The code is invalid or expired." };

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateResetConfirm(body);
  if (!v.ok) return NextResponse.json(v.passwordRule ? { error: "Password must be 12 to 128 characters." } : BAD, { status: 400 });
  try {
    const db = getDb();
    const ip = clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), process.env.TRUSTED_PROXY_HOPS) || "unknown";
    const ipKey: RateLimitKey = { keyType: "pwreset_confirm_ip", keyHash: rateLimitHash("pwreset-confirm-ip:" + ip) };
    if (!activeLock(await readRateLimitRows(db, [ipKey])).allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    const [user] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${v.email}`).limit(1);
    const [row] = user ? await db.select().from(passwordResetCodes).where(and(eq(passwordResetCodes.userId, user.id), isNull(passwordResetCodes.usedAt))).orderBy(desc(passwordResetCodes.createdAt)).limit(1) : [];
    if (!user || !codeUsable(row)) { await recordRateLimitFailure(db, ipKey, 20, 3600); return NextResponse.json(BAD, { status: 400 }); }
    const match = digestsEqual(row.codeHash, hashCode(user.id, v.code));
    if (!match) {
      await db.update(passwordResetCodes).set({ attempts: sql`${passwordResetCodes.attempts} + 1` }).where(eq(passwordResetCodes.id, row.id));
      await recordRateLimitFailure(db, ipKey, 20, 3600);
      return NextResponse.json(BAD, { status: 400 });
    }
    const passwordHash = await hashPassword(v.password);
    const done = await db.transaction(async (tx) => {
      const used = await tx.update(passwordResetCodes).set({ usedAt: new Date() }).where(and(eq(passwordResetCodes.id, row.id), isNull(passwordResetCodes.usedAt))).returning({ id: passwordResetCodes.id });
      if (!used.length) return false;
      await tx.update(users).set({ passwordHash, sessionEpoch: sql`${users.sessionEpoch} + 1`, updatedAt: new Date() }).where(eq(users.id, user.id));
      await tx.insert(auditLogs).values({ actorUserId: user.id, action: "password_reset.completed", entityType: "user", entityId: user.id, details: {} });
      return true;
    });
    if (!done) return NextResponse.json(BAD, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("RABTO password reset confirm failed", error);
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
