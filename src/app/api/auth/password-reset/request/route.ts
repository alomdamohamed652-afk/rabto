import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, passwordResetCodes, users } from "@/db/schema";
import { mailTransportAvailable, sendMail } from "@/lib/mailer";
import { activeLock, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { normalizePhone } from "@/lib/phone-rules.mjs";
import { RESET_POLICY, generateCode, hashCode, validateResetRequest } from "@/lib/password-reset-rules.mjs";
import { clientIpFromForwardedFor, rateLimitHash } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";
// Same answer for every outcome so the response never reveals whether an account exists.
const UNIFORM = { ok: true, message: "If an account with this email exists, a code was sent. Check spam too." };

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const v = validateResetRequest(body);
  if (!v.ok) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  // No provider configured: say so plainly (reveals nothing about accounts) and create no codes.
  if (!mailTransportAvailable()) return NextResponse.json({ error: "Password reset by email is not active yet.", code: "mail_unavailable" }, { status: 503 });
  try {
    const db = getDb();
    const ip = clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), process.env.TRUSTED_PROXY_HOPS) || "unknown";
    const keys: RateLimitKey[] = [
      { keyType: "pwreset_email", keyHash: rateLimitHash("pwreset-email:" + v.email) },
      { keyType: "pwreset_ip", keyHash: rateLimitHash("pwreset-ip:" + ip) },
    ];
    if (!activeLock(await readRateLimitRows(db, keys)).allowed) return NextResponse.json(UNIFORM);
    for (const k of keys) await recordRateLimitFailure(db, k, RESET_POLICY.requestsPerHour, 3600);
    const [user] = await db.select({ id: users.id, email: users.email, phone: users.phone, passwordHash: users.passwordHash, verified: users.emailVerifiedAt }).from(users).where(sql`lower(${users.email}) = ${v.email}`).limit(1);
    // Phone-first flow: when a phone is given, the typed full email must belong to the account with that phone.
    const givenPhone = typeof (body as { phone?: unknown })?.phone === "string" ? normalizePhone((body as { phone: string }).phone) : null;
    if ((body as { phone?: unknown })?.phone !== undefined && (!givenPhone || !user || user.phone !== givenPhone)) return NextResponse.json(UNIFORM);
    // Accounts that never set a password go through their invitation, not reset.
    // Only admin-attested mailboxes receive codes (an unverified address could belong to someone else).
    if (!user || !user.passwordHash || !user.verified) return NextResponse.json(UNIFORM);
    const code = generateCode();
    await db.transaction(async (tx) => {
      await tx.update(passwordResetCodes).set({ usedAt: new Date() }).where(and(eq(passwordResetCodes.userId, user.id), isNull(passwordResetCodes.usedAt)));
      await tx.insert(passwordResetCodes).values({ userId: user.id, codeHash: hashCode(user.id, code), expiresAt: new Date(Date.now() + RESET_POLICY.ttlSeconds * 1000) });
      await tx.insert(auditLogs).values({ actorUserId: user.id, action: "password_reset.requested", entityType: "user", entityId: user.id, details: {} });
    });
    const sent = await sendMail({ to: user.email, subject: "RABTO password reset code", text: `Your RABTO code is ${code}. It expires in 10 minutes. If you did not ask for it, ignore this email.` });
    if (!sent.sent) console.error("RABTO password reset: no mail transport configured, code not delivered.");
    return NextResponse.json(UNIFORM);
  } catch (error) {
    console.error("RABTO password reset request failed", error);
    return NextResponse.json(UNIFORM);
  }
}
