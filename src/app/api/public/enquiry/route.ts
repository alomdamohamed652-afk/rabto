import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLogs, enquiries } from "@/db/schema";
import { activeLock, readRateLimitRows, recordRateLimitFailure, type RateLimitKey } from "@/lib/persistent-rate-limit";
import { normalizePhone } from "@/lib/phone-rules.mjs";
import { clientIpFromForwardedFor, rateLimitHash } from "@/lib/security-primitives.mjs";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/**
 * Public enquiry. Stored for an admin to read; nothing is sent anywhere, so the answer makes no promise about a reply.
 * Contact is an email or a mobile number. Limits: 3 per contact and 10 per IP per hour.
 */
export async function POST(request: Request) {
  let b: { name?: unknown; contact?: unknown; message?: unknown };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";
  const raw = typeof b.contact === "string" ? b.contact.trim() : "";
  const contact = EMAIL.test(raw) ? raw.toLowerCase() : normalizePhone(raw);
  if (!name || name.length > 120 || !message || message.length > 2000 || !contact) return NextResponse.json({ error: "Name, a valid email or mobile number, and a message are required." }, { status: 400 });
  try {
    const db = getDb();
    const ip = clientIpFromForwardedFor(request.headers.get("x-forwarded-for"), process.env.TRUSTED_PROXY_HOPS) || "unknown";
    const keys: RateLimitKey[] = [
      { keyType: "enquiry_contact", keyHash: rateLimitHash("enquiry-contact:" + contact) },
      { keyType: "enquiry_ip", keyHash: rateLimitHash("enquiry-ip:" + ip) },
    ];
    if (!activeLock(await readRateLimitRows(db, keys)).allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    await recordRateLimitFailure(db, keys[0], 3, 3600);
    await recordRateLimitFailure(db, keys[1], 10, 3600);
    await db.transaction(async (tx) => {
      const [row] = await tx.insert(enquiries).values({ name, contact, message }).returning({ id: enquiries.id });
      await tx.insert(auditLogs).values({ actorUserId: null, action: "enquiry.created", entityType: "enquiry", entityId: row.id, details: {} });
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to send the enquiry." }, { status: 500 }); }
}
