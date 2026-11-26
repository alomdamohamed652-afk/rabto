import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { readSessionCookie, verifyPassword } from "@/lib/auth";
import { activeLock, clearRateLimitKey, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { normalizePhone } from "@/lib/phone-rules.mjs";
import { rateLimitHash } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";
const tail = (p: string | null) => (p ? "***" + p.slice(-3) : null);

export async function GET(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [u] = await getDb().select({ phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
  return NextResponse.json({ phoneTail: tail(u?.phone ?? null) });
}

/** PUT {phone, password}: the signed-in customer sets or changes their own recovery/login phone. Needs the current password. */
export async function PUT(request: Request) {
  const userId = await readSessionCookie(request.headers.get("cookie"));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { phone?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
  if (!phone) return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
  if (typeof body.password !== "string" || !body.password) return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  try {
    const db = getDb();
    const key: RateLimitKey = { keyType: "phonechange_user", keyHash: rateLimitHash("phonechange-user:" + userId) };
    if (!activeLock(await readRateLimitRows(db, [key])).allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    const [u] = await db.select({ id: users.id, phone: users.phone, passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
    if (!u || !(await verifyPassword(body.password, u.passwordHash))) {
      await recordRateLimitFailure(db, key, 5, 3600);
      return NextResponse.json({ error: "The password is incorrect." }, { status: 403 });
    }
    const out = await db.transaction(async (tx) => {
      const [clash] = await tx.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), ne(users.id, u.id))).limit(1);
      if (clash) return "unavailable" as const;
      await tx.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, u.id));
      await tx.insert(auditLogs).values({ actorUserId: u.id, action: "user.phone_changed", entityType: "user", entityId: u.id, details: { from: tail(u.phone), to: tail(phone), by: "self" } });
      return "ok" as const;
    });
    if (out === "unavailable") return NextResponse.json({ error: "This number cannot be used." }, { status: 409 });
    await clearRateLimitKey(db, key);
    return NextResponse.json({ ok: true, phoneTail: tail(phone) });
  } catch { return NextResponse.json({ error: "Unable to update the phone." }, { status: 500 }); }
}
