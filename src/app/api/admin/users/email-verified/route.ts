import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";

export const runtime = "nodejs";

/**
 * Admin attests that the mailbox on an account is confirmed to belong to the customer (checked outside
 * the system). Only verified emails can receive reset codes. This is an attestation, not proof: the
 * audit row records who attested. Unverify (verified:false) is allowed.
 */
export async function PUT(request: Request) {
  const actor = await readSessionCookie(request.headers.get("cookie"));
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(actor); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  let body: { email?: unknown; verified?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.email !== "string" || typeof body.verified !== "boolean") return NextResponse.json({ error: "email and verified are required." }, { status: 400 });
  try {
    const email = body.email.trim().toLowerCase();
    const ok = await getDb().transaction(async (tx) => {
      const [u] = await tx.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).for("update").limit(1);
      if (!u) return false;
      await tx.update(users).set({ emailVerifiedAt: body.verified ? new Date() : null, updatedAt: new Date() }).where(eq(users.id, u.id));
      await tx.insert(auditLogs).values({ actorUserId: actor, action: body.verified ? "user.email_attested" : "user.email_unattested", entityType: "user", entityId: u.id, details: {} });
      return true;
    });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Account not found." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Unable to update." }, { status: 500 }); }
}
