import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, emailVerificationCodes, users } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { mailTransportAvailable, sendMail } from "@/lib/mailer";
import { activeLock, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { RESET_POLICY, codeUsable, digestsEqual, generateCode, hashVerifyCode } from "@/lib/password-reset-rules.mjs";
import { rateLimitHash } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

/** GET: is the signed-in account's email verified? */
export async function GET(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [u] = await getDb().select({ at: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  return NextResponse.json({ verified: Boolean(u?.at), verifiedAt: u?.at ?? null, mailAvailable: mailTransportAvailable() });
}

/** POST: mail a 6-digit code to the account's own email (never to an address from the request). */
export async function POST(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mailTransportAvailable()) return NextResponse.json({ error: "Email verification is not active yet.", code: "mail_unavailable" }, { status: 503 });
  try {
    const db = getDb();
    const key: RateLimitKey = { keyType: "emailverify_user", keyHash: rateLimitHash("emailverify-user:" + userId) };
    if (!activeLock(await readRateLimitRows(db, [key])).allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    await recordRateLimitFailure(db, key, RESET_POLICY.requestsPerHour, 3600);
    const [u] = await db.select({ id: users.id, email: users.email, at: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (u.at) return NextResponse.json({ ok: true, alreadyVerified: true });
    const code = generateCode();
    await db.transaction(async (tx) => {
      await tx.update(emailVerificationCodes).set({ usedAt: new Date() }).where(and(eq(emailVerificationCodes.userId, u.id), isNull(emailVerificationCodes.usedAt)));
      await tx.insert(emailVerificationCodes).values({ userId: u.id, codeHash: hashVerifyCode(u.id, code), expiresAt: new Date(Date.now() + RESET_POLICY.ttlSeconds * 1000) });
      await tx.insert(auditLogs).values({ actorUserId: u.id, action: "email_verification.requested", entityType: "user", entityId: u.id, details: {} });
    });
    const sent = await sendMail({ to: u.email, subject: "RABTO email confirmation code", text: `Your RABTO confirmation code is ${code}. It expires in 10 minutes.` });
    if (!sent.sent) return NextResponse.json({ error: "Email verification is not active yet.", code: "mail_unavailable" }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to send the code." }, { status: 500 }); }
}

/** PUT {code}: proves mailbox ownership and sets email_verified_at. One-time, 5 attempts, 10 minutes. */
export async function PUT(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { code?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const BAD = NextResponse.json({ error: "The code is invalid or expired." }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return BAD;
  try {
    const db = getDb();
    // Per-user ceiling on confirmation attempts across all codes (the per-code cap alone resets with each new code).
    const pk: RateLimitKey = { keyType: "emailverify_confirm_user", keyHash: rateLimitHash("emailverify-confirm-user:" + userId) };
    // Count first, then decide on the returned count, so parallel requests cannot all pass a stale read.
    const counted = await recordRateLimitFailure(db, pk, 20, 3600, false);
    if (counted.failedCount > 20) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    const [row] = await db.select().from(emailVerificationCodes).where(and(eq(emailVerificationCodes.userId, userId), isNull(emailVerificationCodes.usedAt))).orderBy(desc(emailVerificationCodes.createdAt)).limit(1);
    if (!codeUsable(row)) return BAD;
    const reserved = await db.update(emailVerificationCodes).set({ attempts: sql`${emailVerificationCodes.attempts} + 1` }).where(and(eq(emailVerificationCodes.id, row.id), isNull(emailVerificationCodes.usedAt), sql`${emailVerificationCodes.attempts} < ${RESET_POLICY.maxAttempts}`, sql`${emailVerificationCodes.expiresAt} > now()`)).returning({ id: emailVerificationCodes.id });
    if (!reserved.length) return BAD;
    if (!digestsEqual(row.codeHash, hashVerifyCode(userId, code))) return BAD;
    const ok = await db.transaction(async (tx) => {
      const used = await tx.update(emailVerificationCodes).set({ usedAt: new Date() }).where(and(eq(emailVerificationCodes.id, row.id), isNull(emailVerificationCodes.usedAt))).returning({ id: emailVerificationCodes.id });
      if (!used.length) return false;
      await tx.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
      await tx.insert(auditLogs).values({ actorUserId: userId, action: "email_verification.confirmed", entityType: "user", entityId: userId, details: {} });
      return true;
    });
    return ok ? NextResponse.json({ ok: true }) : BAD;
  } catch { return NextResponse.json({ error: "Unable to verify." }, { status: 500 }); }
}
