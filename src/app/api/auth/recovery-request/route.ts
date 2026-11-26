import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, recoveryRequests, users } from "@/db/schema";
import { activeLock, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { normalizePhone } from "@/lib/phone-rules.mjs";
import { clientIpFromForwardedFor, rateLimitHash } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

const UNIFORM = { ok: true, message: "If this number belongs to an account, the request was sent to the RABTO team. They will contact you." };
const MAX_NOTE = 500;

/**
 * Public, abuse-protected request for admin-assisted recovery (for people who cannot use the emailed code).
 * It NEVER resets or changes anything: it only adds a row to a queue an admin reviews by hand.
 * The answer is identical for known and unknown phones. Limits: 3 per phone and 10 per IP per hour,
 * one open request per account, note capped at 500 characters.
 */
export async function POST(request: Request) {
  let body: { phone?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) : "";
  try {
    const db = getDb();
    const ip = clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), process.env.TRUSTED_PROXY_HOPS) || "unknown";
    const keys: RateLimitKey[] = [
      { keyType: "recovery_phone", keyHash: rateLimitHash("recovery-phone:" + phone) },
      { keyType: "recovery_ip", keyHash: rateLimitHash("recovery-ip:" + ip) },
    ];
    if (!activeLock(await readRateLimitRows(db, keys)).allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    await recordRateLimitFailure(db, keys[0], 3, 3600);
    await recordRateLimitFailure(db, keys[1], 10, 3600);
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (!user) return NextResponse.json(UNIFORM);
    const [open] = await db.select({ n: sql<number>`count(*)::int` }).from(recoveryRequests).where(and(eq(recoveryRequests.userId, user.id), eq(recoveryRequests.status, "open")));
    if (open.n > 0) return NextResponse.json(UNIFORM);
    await db.transaction(async (tx) => {
      const [row] = await tx.insert(recoveryRequests).values({ userId: user.id, phone, note: note || null }).returning({ id: recoveryRequests.id });
      await tx.insert(auditLogs).values({ actorUserId: null, action: "recovery_request.created", entityType: "recovery_request", entityId: row.id, details: {} });
    });
    return NextResponse.json(UNIFORM);
  } catch { return NextResponse.json({ error: "Unable to send the request." }, { status: 500 }); }
}
