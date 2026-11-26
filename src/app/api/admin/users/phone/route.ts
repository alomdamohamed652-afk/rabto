import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { readSessionCookie } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/access-control";
import { normalizePhone } from "@/lib/phone-rules.mjs";

export const runtime = "nodejs";
const tail = (p: string | null) => (p ? "***" + p.slice(-3) : null);

/** Admin sets, changes or clears the phone of an existing account (by email). Collisions are refused. */
export async function PUT(request: Request) {
  const actor = await readSessionCookie(request.headers.get("cookie"));
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await requirePlatformAdmin(actor); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  let body: { email?: unknown; phone?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.email !== "string") return NextResponse.json({ error: "email is required." }, { status: 400 });
  let phone: string | null = null;
  if (body.phone !== null && body.phone !== undefined && body.phone !== "") {
    phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
    if (!phone) return NextResponse.json({ error: "A valid phone number is required (international format, or Egyptian 01XXXXXXXXX)." }, { status: 400 });
  }
  try {
    const email = body.email.trim().toLowerCase();
    const result = await getDb().transaction(async (tx) => {
      const [u] = await tx.select({ id: users.id, phone: users.phone }).from(users).where(sql`lower(${users.email}) = ${email}`).for("update").limit(1);
      if (!u) return "missing" as const;
      if (phone) {
        const [clash] = await tx.select({ id: users.id }).from(users).where(and(eq(users.phone, phone), ne(users.id, u.id))).limit(1);
        if (clash) return "taken" as const;
      }
      await tx.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, u.id));
      await tx.insert(auditLogs).values({ actorUserId: actor, action: "user.phone_changed", entityType: "user", entityId: u.id, details: { from: tail(u.phone), to: tail(phone) } });
      return "ok" as const;
    });
    if (result === "missing") return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (result === "taken") return NextResponse.json({ error: "This phone number belongs to another account." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unable to update the phone." }, { status: 500 }); }
}
