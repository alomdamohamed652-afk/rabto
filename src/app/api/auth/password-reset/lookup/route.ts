import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { activeLock, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { decoyMaskedEmail, maskEmail } from "@/lib/password-reset-rules.mjs";
import { normalizePhone } from "@/lib/phone-rules.mjs";
import { clientIpFromForwardedFor, rateLimitHash } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

/**
 * Step 1 of reset by phone: phone number in, masked email out. Unknown phones and accounts without a
 * password get a stable decoy mask of the same shape, so the answer does not reveal whether a phone
 * has an account. Strictly rate limited per IP and per phone. Nothing is sent from this route.
 */
export async function POST(request: Request) {
  let body: { phone?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
  try {
    const db = getDb();
    const ip = clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), process.env.TRUSTED_PROXY_HOPS) || "unknown";
    const keys: RateLimitKey[] = [
      { keyType: "pwlookup_phone", keyHash: rateLimitHash("pwlookup-phone:" + phone) },
      { keyType: "pwlookup_ip", keyHash: rateLimitHash("pwlookup-ip:" + ip) },
    ];
    if (!activeLock(await readRateLimitRows(db, keys)).allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    await recordRateLimitFailure(db, keys[0], 5, 3600);
    await recordRateLimitFailure(db, keys[1], 20, 3600);
    const [u] = await db.select({ email: users.email, passwordHash: users.passwordHash, verified: users.emailVerifiedAt }).from(users).where(eq(users.phone, phone)).limit(1);
    const masked = u && u.passwordHash && u.verified ? maskEmail(u.email) : decoyMaskedEmail(rateLimitHash("decoy:" + phone));
    return NextResponse.json({ ok: true, maskedEmail: masked });
  } catch { return NextResponse.json({ error: "Unable to continue." }, { status: 500 }); }
}
